import React from 'react';
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
  EditIcon, 
  TrashIcon 
} from './Icons';

export default function DeviceCard({ 
  device, 
  onToggle, 
  onUpdateTemp, 
  onUpdateCustom, 
  onOpenCCTV,
  onEdit, 
  onDelete 
}) {
  const isThermostat = device.type === 'thermostat';
  const isWashingMachine = device.type === 'washing_machine';
  const isRobotVacuum = device.type === 'robot_vacuum';
  const isCamera = device.type === 'camera';
  const isGlassBalcony = device.type === 'glass_balcony';

  // Cihaz tipine göre uygun ikonu seç
  const renderIcon = () => {
    switch (device.type) {
      case 'light':
        return <LightIcon size={24} />;
      case 'thermostat':
        return <ThermostatIcon size={24} />;
      case 'camera':
        return <CameraIcon size={24} />;
      case 'glass_balcony':
        return <span style={{ fontSize: '24px' }}>🪟</span>;
      case 'lock':
        return <LockIcon size={24} />;
      case 'washing_machine':
        return <WashingMachineIcon size={24} />;
      case 'robot_vacuum':
        return <RobotVacuumIcon size={24} />;
      default:
        return <SocketIcon size={24} />;
    }
  };

  const getTypeLabel = () => {
    switch (device.type) {
      case 'light': return 'Aydınlatma';
      case 'thermostat': return 'Termostat / İklimlendirme';
      case 'camera': return 'Güvenlik Kamerası';
      case 'glass_balcony': return 'Otomatik Cam Balkon';
      case 'lock': return 'Akıllı Kilit';
      case 'washing_machine': return 'Akıllı Çamaşır Makinesi';
      case 'robot_vacuum': return 'Robot Süpürge';
      default: return 'Akıllı Priz';
    }
  };

  return (
    <div className={`device-card ${device.status ? 'is-on' : ''}`}>
      <div className="device-card-header">
        <div className="device-icon-wrapper">
          {renderIcon()}
        </div>
        <div className="device-card-actions">
          <button
            type="button"
            className="action-btn-sm"
            title="Cihazı Düzenle"
            onClick={() => onEdit(device)}
            aria-label="Düzenle"
          >
            <EditIcon size={16} />
          </button>
          <button
            type="button"
            className="action-btn-sm delete"
            title="Cihazı Sil"
            onClick={() => onDelete(device)}
            aria-label="Sil"
          >
            <TrashIcon size={16} />
          </button>
        </div>
      </div>

      <div className="device-info">
        <h4>{device.name}</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
          <span className="device-type-badge">{getTypeLabel()}</span>
          {device.room && (
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(0, 210, 255, 0.08)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(0, 210, 255, 0.2)'
            }}>
              📍 {device.room}
            </span>
          )}
        </div>
      </div>

      <div className="device-controls-area">
        {/* Termostat için Sıcaklık Ayar Alanı */}
        {isThermostat && (
          <div className="thermostat-widget">
            <div className="temp-display">
              <span className="temp-value">{device.temperature ?? 22}</span>
              <span className="temp-unit">°C</span>
            </div>
            <div className="temp-steppers">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => onUpdateTemp && onUpdateTemp(device, (device.temperature || 22) - 1)}
                disabled={!device.status || (device.temperature || 22) <= 16}
                title="Sıcaklığı Düşür"
              >
                -
              </button>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => onUpdateTemp && onUpdateTemp(device, (device.temperature || 22) + 1)}
                disabled={!device.status || (device.temperature || 22) >= 32}
                title="Sıcaklığı Yükselt"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Akıllı Çamaşır Makinesi Kontrolleri */}
        {isWashingMachine && (
          <div className="appliance-card-widget">
            <div className="appliance-status-bar">
              <span className={`appliance-mode-tag ${device.status ? 'running' : 'idle'}`}>
                {device.status ? `● Yıkamada (${device.program || 'Eco'})` : '○ Hazır (Beklemede)'}
              </span>
              <span className="sim-badge" title="Fiziksel donanım bağlı değildir; akıllı simülasyondur">Simülasyon</span>
            </div>

            <div className="appliance-program-select">
              <span className="sub-tag">Program:</span>
              <div className="program-chips-group">
                {['Eco', 'Hızlı', 'Pamuklu'].map((prog) => (
                  <button
                    key={prog}
                    type="button"
                    className={`program-chip ${(device.program || 'Eco') === prog ? 'active' : ''}`}
                    onClick={() => onUpdateCustom && onUpdateCustom(device, { program: prog }, `Program seçildi: ${prog}`)}
                    disabled={device.status}
                    title={device.status ? 'Program çalışırken değiştirilemez' : `${prog} programını seç`}
                  >
                    {prog}
                  </button>
                ))}
              </div>
            </div>

            <div className="appliance-actions-btns">
              {!device.status ? (
                <button
                  type="button"
                  className="appliance-btn start"
                  onClick={() => onUpdateCustom && onUpdateCustom(device, { status: true, programState: 'running' }, `${device.program || 'Eco'} programı başlatıldı`)}
                >
                  <PlayIcon size={13} />
                  <span>Başlat</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="appliance-btn pause"
                  onClick={() => onUpdateCustom && onUpdateCustom(device, { status: false, programState: 'paused' }, 'Yıkama duraklatıldı')}
                >
                  <PauseIcon size={13} />
                  <span>Duraklat</span>
                </button>
              )}

              <button
                type="button"
                className="appliance-btn reset"
                onClick={() => onUpdateCustom && onUpdateCustom(device, { status: false, programState: 'ready' }, 'Çamaşır makinesi hazır duruma alındı')}
                title="Programı bitir/hazır duruma getir"
              >
                Hazır Durum
              </button>
            </div>
          </div>
        )}

        {/* Robot Süpürge Kontrolleri */}
        {isRobotVacuum && (
          <div className="appliance-card-widget">
            <div className="appliance-status-bar">
              <span className={`appliance-mode-tag ${device.mode === 'cleaning' ? 'running' : device.mode === 'docked' ? 'docked' : 'idle'}`}>
                {device.mode === 'cleaning' ? '● Temizlikte' : 
                 device.mode === 'paused' ? '⏸ Duraklatıldı' : 
                 device.mode === 'docked' ? '⚡ Şarj İstasyonunda' : '○ Hazır'}
              </span>
              <span className="battery-telemetry" title="Simüle edilmiş pil seviyesi">
                🔋 %{device.battery ?? 95} <span className="sim-sub">Demo</span>
              </span>
            </div>

            <div className="appliance-actions-btns">
              {device.mode !== 'cleaning' ? (
                <button
                  type="button"
                  className="appliance-btn start"
                  onClick={() => onUpdateCustom && onUpdateCustom(device, { status: true, mode: 'cleaning' }, 'Robot süpürge temizliği başlattı')}
                >
                  <PlayIcon size={13} />
                  <span>Temizliği Başlat</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="appliance-btn pause"
                  onClick={() => onUpdateCustom && onUpdateCustom(device, { status: false, mode: 'paused' }, 'Robot süpürge duraklatıldı')}
                >
                  <PauseIcon size={13} />
                  <span>Duraklat</span>
                </button>
              )}

              <button
                type="button"
                className={`appliance-btn dock ${device.mode === 'docked' ? 'is-docked' : ''}`}
                onClick={() => onUpdateCustom && onUpdateCustom(device, { status: false, mode: 'docked' }, 'Robot süpürge şarj istasyonuna döndü')}
                disabled={device.mode === 'docked'}
                title="Şarj istasyonuna geri döndür"
              >
                ⚡ Şarja Dön
              </button>
            </div>
          </div>
        )}

        {/* Güvenlik Kamerası Özel Kayıt & Canlı Akış Widget'ı */}
        {isCamera && (
          <div className="camera-card-widget">
            <div className="camera-status-bar">
              <span className={`camera-rec-state ${device.status ? 'live' : 'idle'}`}>
                <span className={`cam-dot ${device.status ? 'pulsing' : ''}`} />
                {device.status ? '● Canlı Kayıtta (24/7)' : '○ Beklemede (Kayıt Kapalı)'}
              </span>
              <span className="camera-quality-tag">1080P FHD • 60 FPS</span>
            </div>

            <div className="camera-storage-telemetry">
              <span>💾 SD Kart: 128 GB (%38 Dolu)</span>
              <span>☁️ Bulut: Senkronize</span>
            </div>

            <div className="camera-card-actions">
              <button
                type="button"
                className="camera-live-btn"
                onClick={() => onOpenCCTV && onOpenCCTV(device.id)}
                title="Canlı CCTV ekranını ve geçmiş kayıtları aç"
              >
                <CameraIcon size={14} />
                <span>Canlı İzle & Kayıtlar</span>
              </button>
            </div>
          </div>
        )}

        {/* Otomatik Cam Balkon Kontrolleri */}
        {isGlassBalcony && (
          <div className="glass-card-widget">
            <div className="glass-status-bar">
              <span className={`glass-state-tag ${device.status ? 'closed' : 'open'}`}>
                {device.status ? '🔒 Camlar Kapalı (%100 Yalıtım)' : '🔓 Camlar Açık (Panoramik Açık Teras)'}
              </span>
              <span className="glass-spec-tag">Giyotin Motorlu</span>
            </div>

            <div className="glass-card-actions">
              <button
                type="button"
                className={`glass-action-btn ${device.status ? 'open-btn' : 'close-btn'}`}
                onClick={() => onToggle(device)}
                title={device.status ? 'Camları Aç' : 'Camları Kapat'}
              >
                <span>{device.status ? '🪟 Cam Balkonu Aç' : '🔒 Cam Balkonu Kapat'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Açık/Kapalı Durumu ve Donanım Switch Toggle */}
        <div className="device-toggle-row">
          <div className="status-label">
            <span className={`status-indicator-dot ${device.status ? 'active' : ''}`} />
            <span>
              {isGlassBalcony
                ? (device.status ? 'Camlar Kapalı (Kış Bahçesi)' : 'Camlar Açık (Açık Teras)')
                : (device.status ? 'Çalışıyor (Açık)' : 'Kapalı / Beklemede')}
            </span>
          </div>

          <label className="switch-toggle" title={device.status ? (isGlassBalcony ? 'Cam Balkonu Aç' : 'Kapat') : (isGlassBalcony ? 'Cam Balkonu Kapat' : 'Aç')}>
            <input
              type="checkbox"
              checked={!!device.status}
              onChange={() => onToggle(device)}
            />
            <span className="switch-slider" />
          </label>
        </div>
      </div>
    </div>
  );
}
