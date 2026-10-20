import React, { useState } from 'react';
import './FloorPlan.css';

/**
 * AuraHome - İnteraktif 2D/3D Ev Kat Planı Bileşeni
 * Saf CSS 3D Transforms (rotateX, rotateZ, translateZ) ve Glassmorphism kullanılmıştır.
 * Dış kütüphane (Three.js, Bootstrap, Tailwind vb.) kesinlikle içermez.
 */
export default function FloorPlan({ roomsData }) {
  // Görünüm Modu: '3d' veya '2d'
  const [viewMode, setViewMode] = useState('3d');

  // Varsayılan oda ve cihaz verisi (Props verilmezse kullanılır)
  const defaultRooms = [
    { id: 'salon', name: 'Salon', activeCount: 2, gridClass: 'room-salon' },
    { id: 'mutfak', name: 'Mutfak', activeCount: 1, gridClass: 'room-mutfak' },
    { id: 'yatak', name: 'Yatak Odası', activeCount: 1, gridClass: 'room-yatak' },
    { id: 'banyo', name: 'Banyo', activeCount: 0, gridClass: 'room-banyo' }
  ];

  const rooms = roomsData || defaultRooms;

  return (
    <div className="floorplan-wrapper">
      {/* Üst Bar: Başlık ve 2D/3D Toggle Butonları */}
      <div className="floorplan-topbar">
        <div className="floorplan-title-box">
          <h3>İnteraktif Ev Kat Planı</h3>
          <p>Oda durumlarını ve cihaz yerleşimlerini mimari perspektifte inceleyin.</p>
        </div>

        <div className="floorplan-toggle-group" role="group" aria-label="Görünüm Modu">
          <button
            type="button"
            className={`toggle-btn ${viewMode === '3d' ? 'active' : ''}`}
            onClick={() => setViewMode('3d')}
          >
            3D İzometrik
          </button>
          <button
            type="button"
            className={`toggle-btn ${viewMode === '2d' ? 'active' : ''}`}
            onClick={() => setViewMode('2d')}
          >
            2D Mimari Plan
          </button>
        </div>
      </div>

      {/* 3D Perspektif Sahnesi */}
      <div className="floorplan-viewport">
        {/* CSS Grid Ev Planı: mode-3d veya mode-2d */}
        <div className={`floorplan-house-grid mode-${viewMode}`}>
          {rooms.map((room) => {
            const hasActive = room.activeCount > 0;

            return (
              <div
                key={room.id}
                className={`room-card ${room.gridClass || ''}`}
              >
                {/* Oda Başlığı ve Neon Durum Göstergesi */}
                <div className="room-card-header">
                  <span className="room-name-text">{room.name}</span>
                  <div className="room-status-indicator">
                    <span className={`pulse-dot ${hasActive ? '' : 'inactive'}`} />
                  </div>
                </div>

                {/* Oda Cihaz Durumu */}
                <div className="room-card-footer">
                  <span className="device-status-badge">
                    {hasActive ? `${room.activeCount} Aktif Cihaz` : 'Cihaz Yok'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
