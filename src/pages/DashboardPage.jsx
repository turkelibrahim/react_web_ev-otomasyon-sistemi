import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { devicesApi, rulesApi, notificationsApi } from '../services/api';
import DeviceCard from '../components/DeviceCard';
import RoomVisualizer from '../components/RoomVisualizer';
import CCTVModal from '../components/CCTVModal';
import { getRoomImagePath } from '../utils/roomVisuals';
import Modal from '../components/Modal';
import { onAutomationDeviceUpdate } from '../services/automationEngine';
import { 
  PlusIcon, 
  LightIcon, 
  ThermostatIcon, 
  SlidersIcon,
  PowerIcon,
  CameraIcon
} from '../components/Icons';

// Oda adlarını Türkçe karakter ve yazım toleransıyla güvenle eşleştir
const normalizeRoom = (str) =>
  (str || '')
    .toString()
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[\s\-_]/g, '');

const isSameRoom = (a, b) => normalizeRoom(a) === normalizeRoom(b);

export default function DashboardPage({ onNavigate: _onNavigate }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [devices, setDevices] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [roomFilter, setRoomFilter] = useState('all');

  // Kullanıcının tanımlı odaları
  const userRoomsList = user?.rooms;
  const userRooms = useMemo(() => {
    return userRoomsList && userRoomsList.length > 0 
      ? userRoomsList 
      : ['Salon', 'Yatak Odası', 'Mutfak', 'Banyo', 'Balkon'];
  }, [userRoomsList]);

  // Seçili Stüdyo Odası (Varsayılan kullanıcının ilk odası)
  const [selectedStudioRoom, setSelectedStudioRoom] = useState('Salon');
  const activeStudioRoom = userRooms.some((r) => isSameRoom(r, selectedStudioRoom))
    ? selectedStudioRoom
    : userRooms[0] || 'Salon';

  // Hızlı ardışık tıklamaları önlemek için güncellenen cihaz ID'leri kümesi
  const [updatingIds, setUpdatingIds] = useState(new Set());

  // 24/7 Canlı Güvenlik Kameraları ve NVR Kayıt Merkezi Modal State
  const [isCctvOpen, setIsCctvOpen] = useState(false);
  const [selectedCctvCamId, setSelectedCctvCamId] = useState(null);

  const handleOpenCCTV = (camId = null) => {
    setSelectedCctvCamId(camId);
    setIsCctvOpen(true);
  };

  // Odalar için bağımsız lamba/ambiyans kontrolü (cihazı henüz eklenmemiş odalar dahil)
  const [ambientRoomStates, setAmbientRoomStates] = useState({});

  const handleToggleAmbient = async (roomName, newStatus) => {
    setAmbientRoomStates((prev) => ({ ...prev, [roomName]: newStatus }));

    // Eğer bu odada kayıtlı bir lamba cihazı yoksa veritabanında otomatik oluştur
    const existing = devices.find((d) => isSameRoom(d.room, roomName) && d.type === 'light');
    if (!existing && user?.id) {
      try {
        const created = await devicesApi.create({
          userId: user.id,
          name: `${roomName} Lambası`,
          type: 'light',
          room: roomName,
          status: newStatus
        });
        setDevices((prev) => [...prev, created]);
        const statusText = newStatus ? 'açıldı' : 'kapatıldı';
        toast.success(`"${roomName} Lambası" oluşturuldu ve ${statusText}.`, 'Aydınlatma');
      } catch (err) {
        console.warn('Otomatik lamba kaydı yapılamadı:', err);
      }
    }
  };

  // Cihaz Ekleme / Düzenleme Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState('light');
  const [selectedRoom, setSelectedRoom] = useState(userRooms[0] || 'Salon');
  const [deviceInitialTemp, setDeviceInitialTemp] = useState(22);

  // Silme Onay Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Verileri yükle
  const userId = user?.id;
  const loadData = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const [userDevices, userRules] = await Promise.all([
        devicesApi.getByUser(userId),
        rulesApi.getByUser(userId)
      ]);
      setDevices(userDevices || []);
      setRules(userRules || []);
    } catch (err) {
      console.warn('Veriler sunucudan çekilemedi:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Arka planda çalışan otomasyon motorundan gelen anlık cihaz güncellemelerini senkronize et
  useEffect(() => {
    const unsubscribe = onAutomationDeviceUpdate((updatedDev) => {
      setDevices((prev) =>
        prev.map((d) => (d.id === updatedDev.id ? { ...d, ...updatedDev } : d))
      );
    });
    return unsubscribe;
  }, []);

  // Kat planı veya stüdyodan oda seçildiğinde
  const handleSelectRoom = (roomName) => {
    setSelectedStudioRoom(roomName);
    setRoomFilter(roomName);
  };

  // Cihaz Durumunu Değiştir (Aç / Kapa - Toggle)
  // Tek veri akışı: İstek -> API -> json-server -> Başarılı yanıt -> React state güncellemesi
  const handleToggleDevice = async (device) => {
    if (!device || !device.id) return;
    if (updatingIds.has(device.id)) return; // Çift tıklama engeli

    setUpdatingIds((prev) => new Set(prev).add(device.id));
    const newStatus = !device.status;

    try {
      // 1. & 2. API üzerinden veritabanına PATCH isteği gönder
      const updated = await devicesApi.update(device.id, { status: newStatus });

      // 4. Başarılı yanıttan sonra React state'ini güncelle (Sahte durum gösterilmez)
      setDevices((prev) =>
        prev.map((d) => (d.id === device.id ? (updated || { ...d, status: newStatus }) : d))
      );

      const statusText = newStatus ? 'açıldı' : 'kapatıldı';
      const msg = `"${device.name}" (${device.room || 'Oda'}) başarıyla ${statusText}.`;
      toast.success(msg, 'Cihaz Güncellendi');

      // 7. Bildirim & log kaydet (arkada)
      notificationsApi.create({
        userId: user.id,
        message: `${device.name} [${device.room || 'Oda'}] cihazı ${statusText}.`,
        timestamp: new Date().toISOString()
      }).catch((e) => console.warn('Bildirim kaydedilemedi:', e));
    } catch (err) {
      // 3. İstek başarısızsa durumu değiştirme, hata bildir
      toast.error(`"${device.name}" güncellenemedi: ${err.message}`, 'Bağlantı Hatası');
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(device.id);
        return next;
      });
    }
  };

  // Termostat Sıcaklık Ayarı (Tek veri akışı ile)
  const handleUpdateTemperature = async (device, newTemp) => {
    if (!device || !device.id || newTemp < 16 || newTemp > 32) return;
    if (updatingIds.has(device.id)) return;

    setUpdatingIds((prev) => new Set(prev).add(device.id));

    try {
      const updated = await devicesApi.update(device.id, { temperature: newTemp });
      setDevices((prev) =>
        prev.map((d) => (d.id === device.id ? (updated || { ...d, temperature: newTemp }) : d))
      );

      toast.info(`"${device.name}" sıcaklığı ${newTemp}°C olarak ayarlandı.`, 'Termostat');

      notificationsApi.create({
        userId: user.id,
        message: `${device.name} sıcaklığı ${newTemp}°C yapıldı.`,
        timestamp: new Date().toISOString()
      }).catch((e) => console.warn('Bildirim kaydedilemedi:', e));
    } catch (err) {
      toast.error(`Sıcaklık değeri kaydedilemedi: ${err.message}`);
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(device.id);
        return next;
      });
    }
  };

  // Özel Donanım / Akıllı Ev Cihazı Kontrolleri (Çamaşır Makinesi, Robot Süpürge vb.)
  const handleUpdateDeviceCustom = async (device, updates, actionDesc = '') => {
    if (!device || !device.id) return;
    if (updatingIds.has(device.id)) return;

    setUpdatingIds((prev) => new Set(prev).add(device.id));

    try {
      const updated = await devicesApi.update(device.id, updates);
      setDevices((prev) =>
        prev.map((d) => (d.id === device.id ? (updated || { ...d, ...updates }) : d))
      );

      const desc = actionDesc || 'durumu güncellendi';
      toast.success(`"${device.name}": ${desc}.`, 'Cihaz Kontrolü');

      notificationsApi.create({
        userId: user.id,
        message: `${device.name} [${device.room || 'Mutfak'}] - ${desc}`,
        timestamp: new Date().toISOString()
      }).catch((e) => console.warn('Bildirim kaydedilemedi:', e));
    } catch (err) {
      toast.error(`Cihaz güncellenemedi: ${err.message}`, 'Bağlantı Hatası');
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(device.id);
        return next;
      });
    }
  };

  // Cihaz Ekleme / Düzenleme Modalını Aç
  const handleOpenModal = (device = null, targetRoom = null) => {
    if (device) {
      setEditingDevice(device);
      setDeviceName(device.name);
      setDeviceType(device.type);
      setSelectedRoom(device.room || userRooms[0] || 'Salon');
      setDeviceInitialTemp(device.temperature || 22);
    } else {
      setEditingDevice(null);
      setDeviceName('');
      setDeviceType('light');
      setSelectedRoom(targetRoom || selectedStudioRoom || userRooms[0] || 'Salon');
      setDeviceInitialTemp(22);
    }
    setIsModalOpen(true);
  };

  // Cihaz Kaydet (Ekleme veya Güncelleme - CRUD)
  const handleSaveDevice = async (e) => {
    e.preventDefault();

    // Validasyon
    if (!deviceName.trim()) {
      toast.warning('Lütfen bir cihaz adı belirtiniz.', 'Eksik Bilgi');
      return;
    }

    try {
      if (editingDevice) {
        // GÜNCELLEME (UPDATE)
        const updates = {
          name: deviceName.trim(),
          type: deviceType,
          room: selectedRoom,
          ...(deviceType === 'thermostat' ? { temperature: deviceInitialTemp } : {}),
          ...(deviceType === 'washing_machine' && !editingDevice.program ? { program: 'Eco', programState: 'ready' } : {}),
          ...(deviceType === 'robot_vacuum' && !editingDevice.mode ? { mode: 'docked', battery: 95 } : {})
        };
        const updated = await devicesApi.update(editingDevice.id, updates);
        setDevices((prev) => prev.map((d) => (d.id === editingDevice.id ? updated : d)));
        toast.success(`"${deviceName}" cihazı güncellendi.`, 'Güncelleme Başarılı');

        await notificationsApi.create({
          userId: user.id,
          message: `${deviceName} cihazı [${selectedRoom}] güncellendi.`,
          timestamp: new Date().toISOString()
        });
      } else {
        // EKLEME (CREATE)
        const newDeviceData = {
          userId: user.id,
          name: deviceName.trim(),
          type: deviceType,
          room: selectedRoom,
          status: false,
          ...(deviceType === 'thermostat' ? { temperature: deviceInitialTemp } : {}),
          ...(deviceType === 'washing_machine' ? { program: 'Eco', programState: 'ready' } : {}),
          ...(deviceType === 'robot_vacuum' ? { mode: 'docked', battery: 95 } : {})
        };
        const created = await devicesApi.create(newDeviceData);
        setDevices((prev) => [...prev, created]);
        toast.success(`"${deviceName}" [${selectedRoom}] odasına eklendi!`, 'Cihaz Eklendi');

        await notificationsApi.create({
          userId: user.id,
          message: `Yeni cihaz eklendi: ${deviceName} (${selectedRoom})`,
          timestamp: new Date().toISOString()
        });
      }

      setIsModalOpen(false);
    } catch (err) {
      toast.error('Cihaz kaydedilirken bir hata oluştu: ' + err.message);
    }
  };

  // Cihaz Silme Onayı (DELETE - CRUD)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await devicesApi.delete(deleteTarget.id);
      setDevices((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      toast.success(`"${deleteTarget.name}" başarıyla silindi.`, 'Cihaz Silindi');

      await notificationsApi.create({
        userId: user.id,
        message: `${deleteTarget.name} cihazı sistemden silindi.`,
        timestamp: new Date().toISOString()
      });

      setDeleteTarget(null);
    } catch (err) {
      toast.error('Cihaz silinirken hata oluştu: ' + err.message);
    }
  };

  // Filtreleme (Cihaz Tipi ve Oda Filtresi)
  const filteredDevices = devices.filter((d) => {
    let matchesType = activeFilter === 'all' || d.type === activeFilter;
    if (activeFilter === 'appliances') {
      matchesType = d.type === 'washing_machine' || d.type === 'robot_vacuum';
    }
    const matchesRoom = roomFilter === 'all' || isSameRoom(d.room, roomFilter);
    return matchesType && matchesRoom;
  });

  // İstatistikler
  const totalCount = devices.length;
  const activeCount = devices.filter((d) => d.status).length;

  return (
    <div>
      {/* Sayfa Başlığı */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>Akıllı Kontrol Paneli</h1>
          <p>
            Evinizin fotogerçekçi görsel kontrol merkezi, canlı oda yönetimi ve bağlı akıllı cihazları.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary cctv-header-btn"
            onClick={() => handleOpenCCTV()}
            style={{
              borderColor: 'rgba(239, 68, 68, 0.4)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#f87171',
              fontWeight: 600,
              gap: '8px',
              display: 'inline-flex',
              alignItems: 'center'
            }}
            title="Tüm odaların canlı kamera akışlarını ve 24/7 video kayıt merkezini aç"
          >
            <CameraIcon size={18} />
            <span>📹 24/7 Güvenlik Kamera Merkezi</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenModal()}
          >
            <PlusIcon size={18} />
            <span>Yeni Cihaz Ekle</span>
          </button>
        </div>
      </div>

      {/* İstatistik Widget'ları */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon cyan">
            <PowerIcon size={24} />
          </div>
          <div className="stat-info">
            <h3>{totalCount}</h3>
            <p>Toplam Akıllı Cihaz</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon emerald">
            <LightIcon size={24} />
          </div>
          <div className="stat-info">
            <h3>{activeCount}</h3>
            <p>Aktif / Çalışan Cihaz</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber">
            <ThermostatIcon size={24} />
          </div>
          <div className="stat-info">
            <h3>{userRooms.length}</h3>
            <p>Tanımlı Oda Sayısı</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <SlidersIcon size={24} />
          </div>
          <div className="stat-info">
            <h3>{rules.length}</h3>
            <p>Otomasyon Kuralı</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          EVİM — GÖRSEL KONTROL MERKEZİ (PHOTO-FIRST SMART HOME CONTROL CENTER)
          ========================================================================= */}
      <section className="visual-control-center-section" aria-label="Evim — Görsel Kontrol Merkezi">
        {/* Bölüm Başlığı */}
        <div className="visual-control-header">
          <div className="visual-control-title-group">
            <span className="live-badge" style={{ marginBottom: '6px' }}>CANLI GÖRSEL MERKEZ</span>
            <h2>Evim — Görsel Kontrol Merkezi</h2>
            <p>Gerçekçi oda fotoğrafları üzerinden evinizi canlı yönetin; ışıklar açıldığında ambiyans aydınlanmasını anlık izleyin.</p>
          </div>

          <div className="visual-control-stats-pill">
            <div className="control-stat-item">
              <span className="stat-num">{userRooms.length}</span>
              <span className="stat-label">Oda</span>
            </div>
            <div className="stat-divider" />
            <div className="control-stat-item">
              <span className="stat-num">{activeCount}</span>
              <span className="stat-label">Açık Cihaz</span>
            </div>
          </div>
        </div>

        {/* 1. Fotoğraflı Oda Seçici Kartları */}
        <div className="room-cards-selector-container">
          <div className="room-cards-grid" role="tablist" aria-label="Fotoğraflı Oda Seçimi">
            {userRooms.map((roomName, idx) => {
              const roomDevs = devices.filter((d) => isSameRoom(d.room, roomName));
              const roomActiveDevs = roomDevs.filter((d) => d.status === true);
              const roomLightDevs = roomDevs.filter((d) => d.type === 'light');
              const isRoomLightOn = roomLightDevs.length > 0
                ? roomLightDevs.some((d) => d.status === true)
                : (ambientRoomStates[roomName] ?? true);
              const isSelected = isSameRoom(roomName, activeStudioRoom);
              
              const roomHasActiveCamera = roomDevs.some((d) => d.type === 'camera' && d.status === true);
              const roomHasGlassBalcony = roomDevs.some((d) => d.type === 'glass_balcony');
              const isGlassClosed = roomDevs.some((d) => d.type === 'glass_balcony' && d.status === true);
              const imageSrc = getRoomImagePath(roomName, isRoomLightOn, isGlassClosed);

              return (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`room-select-card ${isSelected ? 'selected' : ''} ${isRoomLightOn ? 'light-active' : 'light-dim'}`}
                  onClick={() => handleSelectRoom(roomName)}
                  title={`${roomName} odasını görüntüle`}
                >
                  {/* Kart Görsel Alanı */}
                  <div className="room-card-media-wrapper">
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={`${roomName} önizleme`}
                        className="room-card-thumbnail"
                        loading="lazy"
                      />
                    ) : (
                      <div className="room-card-fallback-media">
                        <span className="room-fallback-letter">{roomName.charAt(0)}</span>
                        <span className="room-fallback-tag">ÖZEL ODA</span>
                      </div>
                    )}
                    
                    {/* Sıcak Işık Parlaması Katmanı */}
                    <div className="room-card-glow-overlay" />

                    {/* Seçili Rozeti */}
                    {isSelected && (
                      <div className="room-card-active-badge">
                        <span className="active-glow-dot" />
                        SEÇİLİ
                      </div>
                    )}

                    {/* Aktif Güvenlik Kamerası Kayıt Rozeti */}
                    {roomHasActiveCamera && (
                      <div 
                        className="room-card-rec-badge" 
                        title="Bu odada 24/7 canlı güvenlik kaydı aktif"
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '999px',
                          background: 'rgba(239, 68, 68, 0.9)',
                          color: '#fff',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          letterSpacing: '0.05em',
                          boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)',
                          zIndex: 3
                        }}
                      >
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#fff',
                          animation: 'pulse 1.2s infinite'
                        }} />
                        REC
                      </div>
                    )}

                    {/* Cam Balkon Durumu Rozeti */}
                    {roomHasGlassBalcony && (
                      <div 
                        className="room-card-glass-badge" 
                        title={isGlassClosed ? 'Cam Balkon Kapalı (Kış Bahçesi)' : 'Cam Balkon Açık (Açık Teras)'}
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: isSelected ? '72px' : '10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '999px',
                          background: isGlassClosed ? 'rgba(56, 189, 248, 0.9)' : 'rgba(15, 23, 42, 0.75)',
                          color: '#fff',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          zIndex: 3
                        }}
                      >
                        {isGlassClosed ? '🪟 Kapalı' : '🪟 Açık'}
                      </div>
                    )}

                    {/* Işık Durumu Göstergesi */}
                    <div className={`room-card-status-indicator ${isRoomLightOn ? 'on' : 'off'}`}>
                      <LightIcon size={12} />
                      <span>{isRoomLightOn ? 'Işık Açık' : 'Kapalı'}</span>
                    </div>
                  </div>

                  {/* Kart Bilgi Alanı */}
                  <div className="room-card-content">
                    <h4 className="room-card-name">{roomName}</h4>
                    <div className="room-card-meta">
                      <span className="room-card-total">{roomDevs.length} Cihaz</span>
                      <span className="meta-separator">•</span>
                      <span className={`room-card-active-count ${roomActiveDevs.length > 0 ? 'highlight' : ''}`}>
                        {roomActiveDevs.length > 0 ? `${roomActiveDevs.length} Aktif` : 'Devrede Değil'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Ana Seçili Oda Görseli ve Bağlantılı Donanım Kontrol Sahnesi */}
        <div className="visual-control-main-stage">
          <RoomVisualizer
            room={activeStudioRoom}
            devices={devices}
            onToggleDevice={handleToggleDevice}
            onTemperatureChange={handleUpdateTemperature}
            onUpdateCustom={handleUpdateDeviceCustom}
            onToggleAmbient={handleToggleAmbient}
            onOpenCCTV={handleOpenCCTV}
            loading={loading}
          />
        </div>
      </section>

      {/* Cihaz Araç Çubuğu ve Oda / Tip Filtreleri */}
      <div className="devices-toolbar">
        {/* Oda Filtreleri */}
        <div className="filter-chips">
          <span style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', fontWeight: 700, alignSelf: 'center', marginRight: '4px' }}>
            ODA:
          </span>
          <button
            type="button"
            className={`filter-chip ${roomFilter === 'all' ? 'active' : ''}`}
            onClick={() => setRoomFilter('all')}
          >
            Tüm Odalar
          </button>
          {userRooms.map((roomName, i) => (
            <button
              key={i}
              type="button"
              className={`filter-chip ${isSameRoom(roomFilter, roomName) ? 'active' : ''}`}
              onClick={() => handleSelectRoom(roomName)}
            >
              {roomName}
            </button>
          ))}
        </div>

        {/* Cihaz Tipi Filtreleri */}
        <div className="filter-chips">
          <span style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', fontWeight: 700, alignSelf: 'center', marginRight: '4px' }}>
            TİP:
          </span>
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            Tümü
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'light' ? 'active' : ''}`}
            onClick={() => setActiveFilter('light')}
          >
            Aydınlatma
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'thermostat' ? 'active' : ''}`}
            onClick={() => setActiveFilter('thermostat')}
          >
            Termostat & Klima
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'camera' ? 'active' : ''}`}
            onClick={() => setActiveFilter('camera')}
          >
            Güvenlik Kamerası
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'glass_balcony' ? 'active' : ''}`}
            onClick={() => setActiveFilter('glass_balcony')}
          >
            Cam Balkon
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'appliances' ? 'active' : ''}`}
            onClick={() => setActiveFilter('appliances')}
          >
            Ev Aletleri
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'socket' ? 'active' : ''}`}
            onClick={() => setActiveFilter('socket')}
          >
            Priz & Diğer
          </button>
        </div>
      </div>

      {/* Cihaz Listesi / Izgarası */}
      {loading ? (
        <div className="spinner" />
      ) : filteredDevices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <LightIcon size={32} />
          </div>
          <h3>Filtreye Uygun Cihaz Bulunamadı</h3>
          <p>
            {roomFilter !== 'all'
              ? `"${roomFilter}" odasında bu kritere uygun cihaz bulunmuyor.`
              : 'Seçili filtrelere uygun cihaz bulunamadı. Yeni bir cihaz ekleyebilirsiniz.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenModal(null, roomFilter !== 'all' ? roomFilter : null)}
          >
            <PlusIcon size={18} />
            <span>Bu Odaya Cihaz Ekle</span>
          </button>
        </div>
      ) : (
        <div className="devices-grid">
          {filteredDevices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onToggle={handleToggleDevice}
              onUpdateTemp={handleUpdateTemperature}
              onUpdateCustom={handleUpdateDeviceCustom}
              onOpenCCTV={handleOpenCCTV}
              onEdit={handleOpenModal}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Cihaz Ekleme / Düzenleme Modalı */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDevice ? 'Cihazı Düzenle' : 'Yeni Akıllı Cihaz Ekle'}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Vazgeç
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveDevice}
            >
              {editingDevice ? 'Değişiklikleri Kaydet' : 'Cihazı Ekle'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveDevice} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="device-name-input">Cihaz Adı</label>
            <input
              id="device-name-input"
              type="text"
              className="form-input"
              placeholder="Örn: Salon Lambası, Yatak Odası Kliması, Garaj Kamerası"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="device-room-select">Bulunduğu Oda / Alan</label>
            <select
              id="device-room-select"
              className="form-select"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
            >
              {userRooms.map((r, i) => (
                <option key={i} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="device-type-select">Cihaz Türü</label>
            <select
              id="device-type-select"
              className="form-select"
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
            >
              <option value="light">Aydınlatma (Lamba / LED)</option>
              <option value="thermostat">Termostat / Klima</option>
              <option value="washing_machine">🧺 Akıllı Çamaşır Makinesi</option>
              <option value="robot_vacuum">🤖 Robot Süpürge</option>
              <option value="camera">Güvenlik Kamerası</option>
              <option value="glass_balcony">🪟 Otomatik Cam Balkon Sistemi</option>
              <option value="lock">Akıllı Kapı Kilidi</option>
              <option value="socket">Akıllı Priz / Güç Rölesi</option>
            </select>
          </div>

          {deviceType === 'thermostat' && (
            <div className="form-group">
              <label className="form-label" htmlFor="device-temp-input">Başlangıç Sıcaklığı (°C)</label>
              <input
                id="device-temp-input"
                type="number"
                min="16"
                max="32"
                className="form-input"
                value={deviceInitialTemp}
                onChange={(e) => setDeviceInitialTemp(Number(e.target.value))}
              />
            </div>
          )}
        </form>
      </Modal>

      {/* Silme Onay Modalı */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Cihazı Silmek İstediğinize Emin Misiniz?"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDeleteTarget(null)}
            >
              İptal
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleConfirmDelete}
            >
              Evet, Cihazı Sil
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
          <strong>"{deleteTarget?.name}"</strong> ({deleteTarget?.room || 'Oda'}) adlı cihaz sistemden ve veritabanından kalıcı olarak silinecektir. Bu işlem geri alınamaz.
        </p>
      </Modal>

      {/* 24/7 Canlı Güvenlik Kameraları ve NVR Kayıt Merkezi Modalı */}
      <CCTVModal
        isOpen={isCctvOpen}
        onClose={() => setIsCctvOpen(false)}
        devices={devices}
        initialCameraId={selectedCctvCamId}
        onToggleDevice={handleToggleDevice}
      />
    </div>
  );
}
