import React, { useState, useEffect } from 'react';
import './RoomVisualizer.css';
import { 
  LightIcon, 
  ThermostatIcon, 
  CameraIcon, 
  LockIcon, 
  SocketIcon,
  WashingMachineIcon,
  RobotVacuumIcon,
  PlayIcon,
  PauseIcon,
  DashboardIcon 
} from './Icons';
import { getRoomImagePath, getRoomImages } from '../utils/roomVisuals.js';

/**
 * AuraHome - Oda Görselleştirici (RoomVisualizer)
 * 
 * Props:
 * @param {string|object} room - Gösterilecek odanın adı veya nesnesi ('Salon', 'Mutfak', vb.)
 * @param {Array} devices - Sistemdeki cihaz listesi (Bileşen seçili odaya ait olanları türetir)
 * @param {function} onToggleDevice - Cihazın Aç/Kapa durumunu değiştiren callback (device) => void
 * @param {function} onTemperatureChange - Termostat derecesini güncelleyen callback (device, newTemp) => void
 * @param {function} onUpdateCustom - Özel cihaz alanlarını (program, mod vb.) güncelleyen callback
 * @param {boolean} loading - Yüklenme durumu göstergesi
 */

// Türkçe karakter ve yazım toleranslı güvenli oda eşleştirme
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

export default function RoomVisualizer({
  room = 'Salon',
  devices = [],
  onToggleDevice,
  onTemperatureChange,
  onUpdateCustom,
  onToggleAmbient,
  onOpenCCTV,
  loading = false
}) {
  const [failedImages, setFailedImages] = useState({});

  // Canlı HUD Saat ve Kayıt Süresi
  const [hudTime, setHudTime] = useState(new Date());
  const [recSeconds, setRecSeconds] = useState(482);

  // Oda ismini normalize et
  const roomName = typeof room === 'string' ? room : room?.name || 'Salon';

  // Yalnızca bu odaya ait cihazları filtrele (Oda İzolasyonu)
  const roomDevices = (devices || []).filter((d) => isSameRoom(d.room, roomName));

  // Bu odadaki aydınlatma cihazları ve ışık açık/kapalı durumu
  const lightDevices = roomDevices.filter((d) => d.type === 'light');
  const hasLightDevice = lightDevices.length > 0;

  // Odada tanımlı lamba cihazı yoksa kullanılacak bağımsız oda ambiyans durumu
  const [ambientLightState, setAmbientLightState] = useState(true);

  // Işık açık mı: Lamba cihazı varsa onun durumu; yoksa oda ambiyans durumu
  const isLightOn = hasLightDevice 
    ? lightDevices.some((d) => d.status === true) 
    : ambientLightState;

  // Odadaki toplam aktif cihaz sayısı
  const activeCount = roomDevices.filter((d) => d.status === true).length;

  // Odada aktif çalışan güvenlik kamerası var mı? (Simülasyon HUD göstergesi için)
  const activeCamera = roomDevices.find((d) => d.type === 'camera' && d.status === true);

  // Kamera aktif olduğunda canlı zaman sayacı ve HUD saati
  useEffect(() => {
    if (!activeCamera) return;
    const interval = setInterval(() => {
      setHudTime(new Date());
      setRecSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCamera]);

  const formatTimer = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Balkon Cam Sistemi (Motorlu Giyotin Cam Balkon)
  const isBalcony = roomName.toLowerCase().includes('balkon') || roomName.toLowerCase().includes('teras');
  const glassDevice = roomDevices.find((d) => d.type === 'glass_balcony' || d.type === 'curtain');
  const [ambientGlassClosed, setAmbientGlassClosed] = useState(false);
  const isGlassClosed = glassDevice ? Boolean(glassDevice.status) : ambientGlassClosed;

  const handleToggleGlassBalcony = () => {
    if (glassDevice && typeof onToggleDevice === 'function') {
      onToggleDevice(glassDevice);
    } else {
      const nextGlass = !isGlassClosed;
      setAmbientGlassClosed(nextGlass);
      if (typeof onUpdateCustom === 'function') {
        onUpdateCustom({ room: roomName, type: 'glass_balcony' }, { status: nextGlass }, `Cam balkon ${nextGlass ? 'kapatıldı' : 'açıldı'}`);
      }
    }
  };

  const roomImages = getRoomImages(roomName, isGlassClosed);
  const fallbackSrc = getRoomImagePath(roomName, isLightOn, isGlassClosed);
  const hasDualImages = !!roomImages;
  const imageError = hasDualImages
    ? Boolean(failedImages[roomImages.on] && failedImages[roomImages.off])
    : (!fallbackSrc || Boolean(failedImages[fallbackSrc]));

  // Hızlı Işık Aç/Kapa Eylemi (Tüm odalarda her zaman çalışır)
  const handleQuickToggleLights = () => {
    if (hasLightDevice && typeof onToggleDevice === 'function') {
      const targetLight = isLightOn
        ? lightDevices.find((d) => d.status === true) || lightDevices[0]
        : lightDevices[0];
      if (targetLight) {
        onToggleDevice(targetLight);
      }
    } else {
      const nextStatus = !isLightOn;
      setAmbientLightState(nextStatus);
      if (typeof onToggleAmbient === 'function') {
        onToggleAmbient(roomName, nextStatus);
      }
    }
  };

  // Cihaz tipine göre uygun ikonu getir
  const renderDeviceIcon = (type) => {
    switch (type) {
      case 'light': return <LightIcon size={20} />;
      case 'thermostat': return <ThermostatIcon size={20} />;
      case 'camera': return <CameraIcon size={20} />;
      case 'glass_balcony': return <span style={{ fontSize: '18px' }}>🪟</span>;
      case 'lock': return <LockIcon size={20} />;
      case 'washing_machine': return <WashingMachineIcon size={20} />;
      case 'robot_vacuum': return <RobotVacuumIcon size={20} />;
      default: return <SocketIcon size={20} />;
    }
  };

  // Cihaz tipi etiket metni
  const getDeviceTypeLabel = (type) => {
    switch (type) {
      case 'light': return 'Aydınlatma';
      case 'thermostat': return 'Klima & Termostat';
      case 'camera': return 'Güvenlik Kamerası';
      case 'glass_balcony': return 'Otomatik Cam Balkon';
      case 'lock': return 'Akıllı Kilit';
      case 'washing_machine': return 'Akıllı Çamaşır Makinesi';
      case 'robot_vacuum': return 'Robot Süpürge';
      default: return 'Akıllı Priz';
    }
  };

  // Cihaz aç/kapa tıklaması
  const handleToggle = (device) => {
    if (typeof onToggleDevice === 'function') {
      onToggleDevice(device);
    }
  };

  // Termostat sıcaklık artır/azalt
  const handleTempChange = (device, delta) => {
    if (typeof onTemperatureChange === 'function') {
      const currentTemp = device.temperature || 22;
      const nextTemp = Math.min(32, Math.max(16, currentTemp + delta));
      onTemperatureChange(device, nextTemp);
    }
  };

  return (
    <section className="room-visualizer-card" aria-label={`${roomName} Görsel Kontrol Alanı`}>
      {/* Üst Başlık ve Ambiyans Durum Rozeti */}
      <div className="room-visualizer-header">
        <div className="room-header-left">
          <h3 className="room-title-text">{roomName}</h3>
          <span className="room-device-count-badge">
            {roomDevices.length} Cihaz
          </span>
        </div>

        <div className="room-header-right">
          <button
            type="button"
            className={`room-ambience-pill clickable ${isLightOn ? 'light-on' : 'light-off'}`}
            onClick={handleQuickToggleLights}
            title={lightDevices.length > 0 ? (isLightOn ? 'Tıklayarak lambayı kapat' : 'Tıklayarak lambayı aç') : 'Oda Ambiyansı'}
          >
            <span className="ambient-dot" />
            <span>{isLightOn ? 'Işık Açık (Lambayı Kapat)' : 'Işık Kapalı (Lambayı Aç)'}</span>
          </button>

          {isBalcony && (
            <button
              type="button"
              className={`room-ambience-pill clickable ${isGlassClosed ? 'glass-closed' : 'glass-open'}`}
              onClick={handleToggleGlassBalcony}
              title={isGlassClosed ? 'Cam Balkonu Aç (Açık Teras Yap)' : 'Cam Balkonu Kapat (Kış Bahçesi Yap)'}
              style={{
                borderColor: isGlassClosed ? 'rgba(56, 189, 248, 0.6)' : 'rgba(148, 163, 184, 0.3)',
                background: isGlassClosed ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                color: isGlassClosed ? '#38bdf8' : '#cbd5e1'
              }}
            >
              <span className="ambient-dot" style={{ background: isGlassClosed ? '#38bdf8' : '#94a3b8' }} />
              <span>{isGlassClosed ? '🪟 Cam Balkon: Kapalı' : '🪟 Cam Balkon: Açık'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Ana Sahne Görünümü (Dinamik Işık & Kamera Katmanları) */}
      <div 
        className={`room-stage-viewport ${isLightOn ? 'lights-on' : 'lights-off'}`}
      >
        {loading && (
          <div className="room-loading-overlay" role="status" aria-live="polite">
            <div className="room-loading-spinner" />
            <span>Oda sahnesi hazırlanıyor...</span>
          </div>
        )}

        {imageError ? (
          // Görsel bulunamadığında tasarımla uyumlu oda sahnesi
          <div className="room-fallback-scene">
            <div className="room-fallback-icon">
              <DashboardIcon size={30} />
            </div>
            <h4>{roomName} Kontrol Sahnesi</h4>
            <p>Bu oda için özel fotoğraf tanımlanmamış. Odadaki akıllı cihazlarınızı aşağıdaki kontrol panelinden yönetebilirsiniz.</p>
          </div>
        ) : hasDualImages ? (
          <>
            {/* 1. Işık Kapalı Taban Görseli (Lambalar tamamen sönük ve karanlık) */}
            <img
              src={roomImages.off}
              alt={`${roomName} lambalar kapalı gece görünümü`}
              className={`room-stage-image room-stage-image-off ${!isLightOn ? 'active' : ''}`}
              onError={() => setFailedImages((prev) => ({ ...prev, [roomImages.off]: true }))}
              loading="eager"
            />

            {/* 2. Işık Açık Katmanı (Lambalar yanan aydınlık görünüm) */}
            <img
              src={roomImages.on}
              alt={`${roomName} lambalar açık aydınlık görünüm`}
              className={`room-stage-image room-stage-image-on ${isLightOn ? 'active' : ''}`}
              onError={() => setFailedImages((prev) => ({ ...prev, [roomImages.on]: true }))}
              loading="eager"
            />

            {/* 3. Dinamik Sıcak Işıklandırma Katmanı (mix-blend-mode: screen) */}
            <div 
              className="room-light-overlay" 
              aria-hidden="true" 
            />

            {/* 4. Işık Kaynağı Parlama Halesi (Bloom Halo) */}
            <div 
              className="room-light-bloom" 
              aria-hidden="true" 
            />

            {/* 5. Sahne Üzerinde Hızlı Lamba Kontrol Düğmesi */}
            <button
              type="button"
              className={`room-stage-quick-toggle ${isLightOn ? 'is-on' : 'is-off'}`}
              onClick={handleQuickToggleLights}
              title={isLightOn ? `${roomName} lambasını kapat` : `${roomName} lambasını aç`}
              aria-label={isLightOn ? `${roomName} lambasını kapat` : `${roomName} lambasını aç`}
            >
              <LightIcon size={16} />
              <span>{isLightOn ? 'Lambayı Kapat' : 'Lambayı Aç'}</span>
            </button>

            {/* 5.1 Balkon İçin Gerçek Zamanlı Motorlu Cam Balkon Aç/Kapa Düğmesi */}
            {isBalcony && (
              <button
                type="button"
                className={`room-stage-quick-toggle glass-balcony-toggle ${isGlassClosed ? 'is-closed' : 'is-open'}`}
                onClick={handleToggleGlassBalcony}
                title={isGlassClosed ? 'Cam Balkonu Aç (Panoramik Açık Teras)' : 'Cam Balkonu Kapat (Isı Yalıtımlı Kış Bahçesi)'}
                aria-label={isGlassClosed ? 'Cam Balkonu Aç' : 'Cam Balkonu Kapat'}
              >
                <span>{isGlassClosed ? '🪟 Cam Balkon Kapalı (Aç)' : '🪟 Cam Balkonu Kapat'}</span>
              </button>
            )}

            {/* 6. Aktif Güvenlik Kamerası Varsa Gelişmiş Canlı CCTV HUD Katmanı */}
            {activeCamera && (
              <div className="room-camera-hud" aria-label="Canlı Güvenlik Kamerası Kaydı">
                <div className="cctv-corner top-left" />
                <div className="cctv-corner top-right" />
                <div className="cctv-corner bottom-left" />
                <div className="cctv-corner bottom-right" />

                <div className="camera-hud-top">
                  <div className="camera-hud-left">
                    <span className="camera-rec-pill">
                      <span className="camera-rec-dot" />
                      REC ● {formatTimer(recSeconds)}
                    </span>
                    <span className="camera-live-clock">
                      {hudTime.toISOString().replace('T', ' ').substring(0, 19)}
                    </span>
                  </div>

                  <div className="camera-hud-right">
                    <span className="camera-hud-meta">
                      {activeCamera.name} • 1080P FHD @ 60 FPS
                    </span>
                    <button
                      type="button"
                      className="camera-hud-open-btn"
                      onClick={() => onOpenCCTV && onOpenCCTV(activeCamera.id)}
                      title="Canlı CCTV Güvenlik Monitörünü ve Kayıtları Aç"
                    >
                      <CameraIcon size={14} />
                      <span>Canlı İzle & Kayıtlar</span>
                    </button>
                  </div>
                </div>

                <div className="camera-center-crosshair">
                  <div className="camera-reticle">
                    <span>● 24/7 GÜVENLİK KAYDI AKTİF [HAREKET SENSÖRÜ İZLİYOR]</span>
                  </div>
                </div>

                <div className="camera-hud-bottom">
                  <div className="camera-storage-indicator">
                    <span>💾 SD KART: 128 GB (%38 DOLU)</span>
                    <span className="telemetry-sep">•</span>
                    <span>☁️ BULUT ARŞİVİ SENKRONİZE</span>
                  </div>
                  <div className="camera-sim-tag">
                    24/7 NVR KAYDI
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Tekil Fallback Görseli */}
            <img
              src={fallbackSrc}
              alt={`${roomName} iç mekân görünümü`}
              className="room-stage-image"
              onError={() => setFailedImages((prev) => ({ ...prev, [fallbackSrc]: true }))}
              loading="lazy"
            />
            <div className="room-light-overlay" aria-hidden="true" />
            <div className="room-light-bloom" aria-hidden="true" />
            <button
              type="button"
              className={`room-stage-quick-toggle ${isLightOn ? 'is-on' : 'is-off'}`}
              onClick={handleQuickToggleLights}
              title={isLightOn ? `${roomName} lambasını kapat` : `${roomName} lambasını aç`}
              aria-label={isLightOn ? `${roomName} lambasını kapat` : `${roomName} lambasını aç`}
            >
              <LightIcon size={16} />
              <span>{isLightOn ? 'Lambayı Kapat' : 'Lambayı Aç'}</span>
            </button>

            {isBalcony && (
              <button
                type="button"
                className={`room-stage-quick-toggle glass-balcony-toggle ${isGlassClosed ? 'is-closed' : 'is-open'}`}
                onClick={handleToggleGlassBalcony}
                title={isGlassClosed ? 'Cam Balkonu Aç' : 'Cam Balkonu Kapat'}
                aria-label={isGlassClosed ? 'Cam Balkonu Aç' : 'Cam Balkonu Kapat'}
              >
                <span>{isGlassClosed ? '🪟 Cam Balkon Kapalı (Aç)' : '🪟 Cam Balkonu Kapat'}</span>
              </button>
            )}
            {activeCamera && (
              <div className="room-camera-hud" aria-label="Canlı Güvenlik Kamerası Kaydı">
                <div className="cctv-corner top-left" />
                <div className="cctv-corner top-right" />
                <div className="cctv-corner bottom-left" />
                <div className="cctv-corner bottom-right" />

                <div className="camera-hud-top">
                  <div className="camera-hud-left">
                    <span className="camera-rec-pill">
                      <span className="camera-rec-dot" />
                      REC ● {formatTimer(recSeconds)}
                    </span>
                    <span className="camera-live-clock">
                      {hudTime.toISOString().replace('T', ' ').substring(0, 19)}
                    </span>
                  </div>

                  <div className="camera-hud-right">
                    <span className="camera-hud-meta">
                      {activeCamera.name} • 1080P FHD @ 60 FPS
                    </span>
                    <button
                      type="button"
                      className="camera-hud-open-btn"
                      onClick={() => onOpenCCTV && onOpenCCTV(activeCamera.id)}
                      title="Canlı CCTV Güvenlik Monitörünü ve Kayıtları Aç"
                    >
                      <CameraIcon size={14} />
                      <span>Canlı İzle & Kayıtlar</span>
                    </button>
                  </div>
                </div>

                <div className="camera-center-crosshair">
                  <div className="camera-reticle">
                    <span>● 24/7 GÜVENLİK KAYDI AKTİF [HAREKET SENSÖRÜ İZLİYOR]</span>
                  </div>
                </div>

                <div className="camera-hud-bottom">
                  <div className="camera-storage-indicator">
                    <span>💾 SD KART: 128 GB (%38 DOLU)</span>
                    <span className="telemetry-sep">•</span>
                    <span>☁️ BULUT ARŞİVİ SENKRONİZE</span>
                  </div>
                  <div className="camera-sim-tag">
                    24/7 NVR KAYDI
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Alt Kontrol Paneli: Odaya Ait Cihazların Donanım Kontrolleri */}
      <div className="room-controls-panel">
        <div className="room-controls-title">
          <h4>Odadaki Akıllı Cihazlar</h4>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            {activeCount > 0 ? `${activeCount} cihaz devrede` : 'Tüm cihazlar kapalı'}
          </span>
        </div>

        {roomDevices.length === 0 ? (
          <div className="room-empty-devices">
            Bu odaya ({roomName}) henüz atanmış bir akıllı cihaz bulunmuyor.
          </div>
        ) : (
          <div className="room-devices-grid">
            {roomDevices.map((device) => {
              const isThermostat = device.type === 'thermostat';
              const isWashingMachine = device.type === 'washing_machine';
              const isRobotVacuum = device.type === 'robot_vacuum';

              return (
                <div 
                  key={device.id} 
                  className={`visualizer-device-item ${device.status ? 'active' : ''}`}
                >
                  <div className="device-item-left">
                    <div className="device-item-icon-box">
                      {renderDeviceIcon(device.type)}
                    </div>
                    <div className="device-item-info">
                      <span className="device-item-name" title={device.name}>
                        {device.name}
                      </span>
                      <span className="device-item-meta">
                        {getDeviceTypeLabel(device.type)}
                        {isThermostat && ` • ${device.temperature || 22}°C`}
                        {isWashingMachine && ` • ${device.program || 'Eco'} (${device.status ? 'Çalışıyor' : 'Hazır'})`}
                        {isRobotVacuum && ` • Pil: %${device.battery ?? 95} (${device.mode === 'cleaning' ? 'Temizlikte' : device.mode === 'docked' ? 'Şarjda' : 'Hazır'})`}
                      </span>
                    </div>
                  </div>

                  {/* Cihaz Türüne Özel Kontroller */}
                  {isThermostat ? (
                    <div className="visualizer-temp-control" aria-label={`${device.name} sıcaklık ayarı`}>
                      <button
                        type="button"
                        className="temp-btn"
                        onClick={() => handleTempChange(device, -1)}
                        disabled={!device.status || (device.temperature || 22) <= 16}
                        aria-label="Sıcaklığı düşür"
                        title="Sıcaklığı Düşür (-1°C)"
                      >
                        -
                      </button>
                      <span className="temp-val-text">{device.temperature || 22}°</span>
                      <button
                        type="button"
                        className="temp-btn"
                        onClick={() => handleTempChange(device, 1)}
                        disabled={!device.status || (device.temperature || 22) >= 32}
                        aria-label="Sıcaklığı yükselt"
                        title="Sıcaklığı Yükselt (+1°C)"
                      >
                        +
                      </button>

                      <label className="visualizer-switch" title={device.status ? 'Kapat' : 'Aç'}>
                        <input
                          type="checkbox"
                          checked={!!device.status}
                          onChange={() => handleToggle(device)}
                          aria-label={`${device.name} güç anahtarı`}
                        />
                        <span className="visualizer-slider" />
                      </label>
                    </div>
                  ) : isWashingMachine ? (
                    <div className="visualizer-appliance-controls" aria-label={`${device.name} kontrolleri`}>
                      <div className="visualizer-chips-mini">
                        {['Eco', 'Hızlı', 'Pamuklu'].map((prog) => (
                          <button
                            key={prog}
                            type="button"
                            className={`mini-chip ${(device.program || 'Eco') === prog ? 'active' : ''}`}
                            onClick={() => onUpdateCustom && onUpdateCustom(device, { program: prog }, `Program seçildi: ${prog}`)}
                            disabled={device.status}
                            title={`${prog} programı`}
                          >
                            {prog}
                          </button>
                        ))}
                      </div>

                      {!device.status ? (
                        <button
                          type="button"
                          className="mini-action-btn start"
                          onClick={() => onUpdateCustom && onUpdateCustom(device, { status: true, programState: 'running' }, `${device.program || 'Eco'} programı başlatıldı`)}
                          title="Yıkamayı Başlat"
                        >
                          <PlayIcon size={12} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="mini-action-btn pause"
                          onClick={() => onUpdateCustom && onUpdateCustom(device, { status: false, programState: 'paused' }, 'Yıkama duraklatıldı')}
                          title="Yıkamayı Duraklat"
                        >
                          <PauseIcon size={12} />
                        </button>
                      )}

                      <label className="visualizer-switch" title={device.status ? 'Kapat' : 'Aç'}>
                        <input
                          type="checkbox"
                          checked={!!device.status}
                          onChange={() => handleToggle(device)}
                          aria-label={`${device.name} güç anahtarı`}
                        />
                        <span className="visualizer-slider" />
                      </label>
                    </div>
                  ) : isRobotVacuum ? (
                    <div className="visualizer-appliance-controls" aria-label={`${device.name} kontrolleri`}>
                      <span className="mini-mode-tag" title="Çalışma Modu">
                        {device.mode === 'cleaning' ? 'Temizlikte' : 
                         device.mode === 'paused' ? 'Duraklatıldı' : 
                         device.mode === 'docked' ? 'Şarjda' : 'Hazır'}
                      </span>

                      {device.mode !== 'cleaning' ? (
                        <button
                          type="button"
                          className="mini-action-btn start"
                          onClick={() => onUpdateCustom && onUpdateCustom(device, { status: true, mode: 'cleaning' }, 'Temizlik başlatıldı')}
                          title="Temizliği Başlat"
                        >
                          <PlayIcon size={12} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="mini-action-btn pause"
                          onClick={() => onUpdateCustom && onUpdateCustom(device, { status: false, mode: 'paused' }, 'Temizlik duraklatıldı')}
                          title="Temizliği Duraklat"
                        >
                          <PauseIcon size={12} />
                        </button>
                      )}

                      <button
                        type="button"
                        className={`mini-action-btn dock ${device.mode === 'docked' ? 'disabled' : ''}`}
                        onClick={() => onUpdateCustom && onUpdateCustom(device, { status: false, mode: 'docked' }, 'Şarj istasyonuna döndü')}
                        disabled={device.mode === 'docked'}
                        title="Şarj İstasyonuna Dön"
                      >
                        ⚡
                      </button>

                      <label className="visualizer-switch" title={device.status ? 'Kapat' : 'Aç'}>
                        <input
                          type="checkbox"
                          checked={!!device.status}
                          onChange={() => handleToggle(device)}
                          aria-label={`${device.name} güç anahtarı`}
                        />
                        <span className="visualizer-slider" />
                      </label>
                    </div>
                  ) : device.type === 'camera' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        className="mini-action-btn cctv"
                        onClick={() => onOpenCCTV && onOpenCCTV(device.id)}
                        title="Canlı CCTV Monitörü ve Kayıt Galerisi"
                        style={{
                          padding: '4px 10px',
                          width: 'auto',
                          height: '28px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          gap: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          cursor: 'pointer'
                        }}
                      >
                        <CameraIcon size={14} />
                        <span>{device.status ? 'REC İzle' : 'Kayıtlar'}</span>
                      </button>

                      <label className="visualizer-switch" title={device.status ? 'Kaydı Durdur' : 'Kayıt Başlat'}>
                        <input
                          type="checkbox"
                          checked={!!device.status}
                          onChange={() => handleToggle(device)}
                          aria-label={`${device.name} kayıt anahtarı`}
                        />
                        <span className="visualizer-slider" />
                      </label>
                    </div>
                  ) : device.type === 'glass_balcony' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        padding: '3px 8px', 
                        borderRadius: '4px',
                        background: device.status ? 'rgba(56, 189, 248, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                        color: device.status ? '#38bdf8' : '#94a3b8',
                        border: device.status ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(148, 163, 184, 0.3)'
                      }}>
                        {device.status ? '🔒 Camlar Kapalı' : '🔓 Açık Teras'}
                      </span>
                      <button
                        type="button"
                        className="mini-action-btn"
                        onClick={() => handleToggle(device)}
                        title={device.status ? 'Cam Balkonu Aç' : 'Cam Balkonu Kapat'}
                        style={{
                          padding: '4px 10px',
                          width: 'auto',
                          height: '28px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: device.status ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                          color: device.status ? '#38bdf8' : '#f8fafc',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          cursor: 'pointer'
                        }}
                      >
                        <span>{device.status ? 'Aç' : 'Kapat'}</span>
                      </button>
                      <label className="visualizer-switch" title={device.status ? 'Cam Balkonu Aç' : 'Cam Balkonu Kapat'}>
                        <input
                          type="checkbox"
                          checked={!!device.status}
                          onChange={() => handleToggle(device)}
                          aria-label={`${device.name} anahtarı`}
                        />
                        <span className="visualizer-slider" />
                      </label>
                    </div>
                  ) : (
                    <label className="visualizer-switch" title={device.status ? 'Kapat' : 'Aç'}>
                      <input
                        type="checkbox"
                        checked={!!device.status}
                        onChange={() => handleToggle(device)}
                        aria-label={`${device.name} güç anahtarı`}
                      />
                      <span className="visualizer-slider" />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
