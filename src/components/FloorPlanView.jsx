import React, { useState } from 'react';
import { 
  LightIcon, 
  ThermostatIcon, 
  CameraIcon, 
  LockIcon, 
  SocketIcon, 
  PowerIcon, 
  PlusIcon 
} from './Icons';

export default function FloorPlanView({ 
  rooms = [], 
  devices = [], 
  selectedRoom = 'Salon', 
  onSelectRoom, 
  onToggleDevice, 
  onAddDeviceToRoom 
}) {
  const [viewMode, setViewMode] = useState('view-3d'); // 'view-2d' veya 'view-3d'

  // Varsayılan odalar
  const userRooms = rooms.length > 0 
    ? rooms 
    : ['Salon', 'Yatak Odası', 'Mutfak', 'Banyo'];

  // Cihaz tipine göre ikon
  const getDeviceIcon = (type) => {
    switch (type) {
      case 'light': return <LightIcon size={18} />;
      case 'thermostat': return <ThermostatIcon size={18} />;
      case 'camera': return <CameraIcon size={18} />;
      case 'lock': return <LockIcon size={18} />;
      default: return <SocketIcon size={18} />;
    }
  };

  return (
    <div className="floorplan-container">
      {/* Üst Kontrol Barı */}
      <div className="floorplan-header">
        <div className="floorplan-title-area">
          <span className="live-badge">CANLI KROKİ</span>
          <h3>İnteraktif Akıllı Ev Kat Planı (2D / 3D Görünüm)</h3>
          <p>Oda durumlarını incelemek için bir odaya tıklayın; cihazları doğrudan kat planı üzerinden anlık yönetin.</p>
        </div>

        {/* Görünüm Modu Değiştirici (2D / 3D İzometrik) */}
        <div className="view-mode-tabs">
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'view-3d' ? 'active' : ''}`}
            onClick={() => setViewMode('view-3d')}
          >
            3D İzometrik
          </button>
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'view-2d' ? 'active' : ''}`}
            onClick={() => setViewMode('view-2d')}
          >
            2D Mimari Plan
          </button>
        </div>
      </div>

      {/* Ev Krokisi Sahnesi */}
      <div className={`floorplan-viewport ${viewMode}`}>
        <div className="floorplan-grid">
          {userRooms.map((roomName, idx) => {
            const roomDevices = devices.filter((d) => 
              (d.room || 'Salon').toLowerCase().trim() === roomName.toLowerCase().trim()
            );
            const hasActiveLight = roomDevices.some((d) => d.type === 'light' && d.status);
            const activeCount = roomDevices.filter((d) => d.status).length;
            const isSelected = (selectedRoom || '').toLowerCase().trim() === roomName.toLowerCase().trim();

            return (
              <div
                key={idx}
                className={`room-zone room-zone-clickable ${hasActiveLight ? 'light-on' : 'light-off'} ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  if (typeof onSelectRoom === 'function') onSelectRoom(roomName);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (typeof onSelectRoom === 'function') onSelectRoom(roomName);
                  }
                }}
                aria-label={`${roomName} odasını stüdyoda incele`}
              >
                {/* Oda Başlığı & Durum */}
                <div className="room-header-badge">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="room-name">{roomName}</span>
                    {isSelected && <span className="room-selected-badge">SEÇİLİ ODA</span>}
                  </div>
                  <span className={`room-status-pill ${activeCount > 0 ? 'active' : ''}`}>
                    {activeCount > 0 ? `${activeCount} / ${roomDevices.length} Aktif` : 'Tümü Kapalı'}
                  </span>
                </div>

                {/* Oda İçi Mimari Zemin Çizgisi */}
                <div className="room-floor-pattern" />

                {/* Oda İçi Cihazlar (İnteraktif Pinler) */}
                <div className="room-devices-container">
                  {roomDevices.length === 0 ? (
                    <div className="empty-room-placeholder">
                      <span>Bu odada cihaz yok</span>
                      <button
                        type="button"
                        className="btn-add-to-room"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddDeviceToRoom(roomName);
                        }}
                        title={`${roomName} odasına cihaz ekle`}
                      >
                        <PlusIcon size={14} />
                        <span>Cihaz Ekle</span>
                      </button>
                    </div>
                  ) : (
                    roomDevices.map((dev) => (
                      <div
                        key={dev.id}
                        className={`device-pin ${dev.status ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleDevice(dev);
                        }}
                        title={`"${dev.name}" durumunu değiştirmek için tıklayın`}
                      >
                        <div className="device-pin-icon">
                          {getDeviceIcon(dev.type)}
                        </div>

                        <div className="device-pin-info">
                          <span className="pin-name">{dev.name}</span>
                          {dev.type === 'thermostat' && (
                            <span className="pin-meta">{dev.temperature || 22}°C</span>
                          )}
                          {dev.type !== 'thermostat' && (
                            <span className="pin-meta">{dev.status ? 'Açık' : 'Kapalı'}</span>
                          )}
                        </div>

                        <div className="device-pin-switch-hint">
                          <PowerIcon size={13} />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Odaya Hızlı Cihaz Ekleme Butonu */}
                {roomDevices.length > 0 && (
                  <button
                    type="button"
                    className="room-quick-add"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddDeviceToRoom(roomName);
                    }}
                    title={`Bu odaya (${roomName}) yeni cihaz bağla`}
                  >
                    <PlusIcon size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
