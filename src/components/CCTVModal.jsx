import React, { useState, useEffect } from 'react';
import './CCTVModal.css';
import { 
  CameraIcon, 
  PlayIcon, 
  PauseIcon, 
  XIcon, 
  ShieldIcon 
} from './Icons';
import { getRoomImagePath } from '../utils/roomVisuals';
import { useToast } from '../context/ToastContext';

export default function CCTVModal({
  isOpen,
  onClose,
  initialCameraId = null,
  devices = [],
  onToggleDevice
}) {
  const { toast } = useToast();

  // Tüm güvenlik kameralarını listele
  const cameraDevices = devices.filter((d) => d.type === 'camera');

  // Seçili aktif kamera
  const [selectedCamId, setSelectedCamId] = useState(null);

  // Canlı saat ve sayaç
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedSeconds, setElapsedSeconds] = useState(482); // Başlangıç kayıt süresi simülasyonu
  const [nightVision, setNightVision] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState('clips'); // 'clips' | 'snapshots'
  const [playingClip, setPlayingClip] = useState(null);
  const [playProgress, setPlayProgress] = useState(0);

  // Kaydedilen örnek klipler ve anlık çekimler
  const [recordings, setRecordings] = useState([
    {
      id: 'clip-1',
      title: '24/7 Sürekli Döngü Kaydı',
      time: 'Bugün 17:20 - 17:30',
      duration: '10:00',
      size: '112.4 MB',
      type: 'loop',
      room: 'Balkon'
    },
    {
      id: 'clip-2',
      title: '⚠️ Hareket Algılandı (Korkuluk Önü)',
      time: 'Bugün 16:45',
      duration: '01:45',
      size: '19.8 MB',
      type: 'motion',
      room: 'Balkon'
    },
    {
      id: 'clip-3',
      title: '⚠️ İnsan Hareketi Algılama',
      time: 'Bugün 15:10',
      duration: '02:30',
      size: '28.1 MB',
      type: 'person',
      room: 'Salon'
    },
    {
      id: 'clip-4',
      title: '24/7 Gece Güvenlik Kaydı',
      time: 'Dün 23:00 - 07:00',
      duration: '08:00:00',
      size: '4.8 GB',
      type: 'night',
      room: 'Balkon'
    }
  ]);

  const [snapshots, setSnapshots] = useState([
    {
      id: 'snap-1',
      title: 'Anlık Güvenlik Çekimi',
      time: 'Bugün 17:15',
      room: 'Balkon',
      size: '2.4 MB'
    }
  ]);

  // Modal açıldığında seçili kamerayı ayarla
  useEffect(() => {
    if (isOpen) {
      if (initialCameraId) {
        setSelectedCamId(initialCameraId);
      } else if (cameraDevices.length > 0 && !selectedCamId) {
        setSelectedCamId(cameraDevices[0].id);
      }
    }
  }, [isOpen, initialCameraId, cameraDevices]);

  // Canlı zamanlayıcı (her saniye saat ve sayaç artar)
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Klip oynatma simülasyonu
  useEffect(() => {
    if (!playingClip) return;
    const interval = setInterval(() => {
      setPlayProgress((prev) => {
        if (prev >= 100) {
          setPlayingClip(null);
          return 0;
        }
        return prev + 5;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [playingClip]);

  if (!isOpen) return null;

  const currentCam = cameraDevices.find((c) => c.id === selectedCamId) || cameraDevices[0];
  const camRoom = currentCam?.room || 'Balkon';
  const isRecording = Boolean(currentCam?.status);
  const glassDevice = devices.find((d) => d.type === 'glass_balcony');
  const isGlassClosed = glassDevice ? Boolean(glassDevice.status) : false;
  const roomImage = getRoomImagePath(camRoom, false, isGlassClosed) || getRoomImagePath(camRoom, true, isGlassClosed) || '/rooms/balkon.webp';

  // Sayaç biçimlendirme (HH:MM:SS)
  const formatTimer = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Anlık saat metni
  const timeString = currentTime.toISOString().replace('T', ' ').substring(0, 19);
  const msString = currentTime.getMilliseconds().toString().padStart(3, '0');

  // Kayıt durumunu aç/kapa
  const handleToggleRecord = () => {
    if (currentCam && typeof onToggleDevice === 'function') {
      onToggleDevice(currentCam);
      if (!isRecording) {
        toast.success(`"${currentCam.name}" 24/7 canlı kayda başladı. Yerel arşiv ve bulut aktif.`, 'Kayıt Başlatıldı');
      } else {
        toast.info(`"${currentCam.name}" kaydı durduruldu. Son klip arşive kaydedildi.`, 'Kayıt Sonlandırıldı');
      }
    }
  };

  // Anlık Fotoğraf Çek
  const handleTakeSnapshot = () => {
    const newSnap = {
      id: `snap-${Date.now()}`,
      title: `${camRoom} Anlık Görüntü`,
      time: `Bugün ${currentTime.toLocaleTimeString()}`,
      room: camRoom,
      size: '2.8 MB'
    };
    setSnapshots((prev) => [newSnap, ...prev]);
    toast.success(`📸 "${camRoom}" kamerasından 1080P anlık fotoğraf çekildi ve galeriye kaydedildi!`, 'Fotoğraf Kaydedildi');
  };

  // Siren Testi
  const handleTriggerAlarm = () => {
    toast.warning(`🚨 "${currentCam?.name || 'Kamera'}" caydırıcı alarm ve flaşör sinyali tetiklendi!`, 'Güvenlik Uyarısı');
  };

  // Klip Oynat
  const handlePlayClip = (clip) => {
    setPlayingClip(clip);
    setPlayProgress(0);
    toast.info(`▶ "${clip.title}" klibi izleniyor...`);
  };

  // Klip Sil
  const handleDeleteClip = (clipId) => {
    setRecordings((prev) => prev.filter((c) => c.id !== clipId));
    toast.info('Kayıtlı video arşivi güncellendi.');
  };

  return (
    <div className="cctv-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="cctv-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Üst Başlık Çubuğu */}
        <div className="cctv-modal-header">
          <div className="cctv-header-title">
            <div className="cctv-title-icon">
              <CameraIcon size={22} />
            </div>
            <div>
              <h3>AuraHome Canlı CCTV & Güvenlik Kayıt Merkezi</h3>
              <p>Evinizin 24/7 video kayıtları, canlı akışları, hareket uyarıları ve yerel SD/Bulut arşivi.</p>
            </div>
          </div>

          <button 
            type="button" 
            className="cctv-close-btn" 
            onClick={onClose}
            aria-label="Kapat"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Kamera Seçim Sekmeleri */}
        <div className="cctv-camera-tabs">
          {cameraDevices.map((cam) => {
            const isCamActive = Boolean(cam.status);
            const isSelected = cam.id === currentCam?.id;

            return (
              <button
                key={cam.id}
                type="button"
                className={`cctv-tab-btn ${isSelected ? 'active' : ''} ${isCamActive ? 'recording' : 'idle'}`}
                onClick={() => {
                  setSelectedCamId(cam.id);
                  setPlayingClip(null);
                }}
              >
                <span className={`cctv-tab-dot ${isCamActive ? 'rec-pulse' : ''}`} />
                <span className="cctv-tab-name">{cam.room || cam.name}</span>
                <span className="cctv-tab-tag">{isCamActive ? 'REC ●' : 'KAPALI'}</span>
              </button>
            );
          })}
        </div>

        {/* Ana İçerik Grid (Sol Canlı Ekran - Sağ Kayıt Kütüphanesi) */}
        <div className="cctv-main-content">
          {/* Sol: Canlı CCTV Monitörü */}
          <div className="cctv-monitor-column">
            <div className={`cctv-screen-viewport ${nightVision ? 'night-vision' : ''}`}>
              {/* Taban Mekân Görseli */}
              <img
                src={roomImage}
                alt={`${camRoom} Canlı CCTV Akışı`}
                className="cctv-feed-image"
              />

              {/* CCTV Tarama Çizgileri & HUD */}
              <div className="cctv-hud-overlay">
                {/* 4 Köşe Nişangâh Çerçevesi */}
                <div className="cctv-corner top-left" />
                <div className="cctv-corner top-right" />
                <div className="cctv-corner bottom-left" />
                <div className="cctv-corner bottom-right" />

                {/* Üst Canlı Kayıt Bilgisi */}
                <div className="cctv-hud-top-bar">
                  <div className="cctv-rec-indicator">
                    {isRecording ? (
                      <span className="cctv-rec-pill live">
                        <span className="cctv-rec-blink" />
                        REC ● {formatTimer(elapsedSeconds)}
                      </span>
                    ) : (
                      <span className="cctv-rec-pill paused">
                        ⏸ KAYIT BEKLEMEDE
                      </span>
                    )}
                    <span className="cctv-live-clock">{timeString}.{msString}</span>
                  </div>

                  <div className="cctv-telemetry-pill">
                    <span>{camRoom.toUpperCase()} CAM-0{currentCam?.id || 1}</span>
                    <span className="telemetry-sep">•</span>
                    <span>1080P FHD @ 60 FPS</span>
                    <span className="telemetry-sep">•</span>
                    <span>4.8 Mbps H.265</span>
                  </div>
                </div>

                {/* Merkez Hedefleme & Hareket Alanı */}
                <div className="cctv-center-crosshair">
                  <div className="cctv-reticle-box">
                    <span className="reticle-label">
                      {isRecording ? '● HAREKET ALGILAMA AKTİF (ALAN GÜVENLİ)' : '○ KAMERA BEKLEMEDE'}
                    </span>
                  </div>
                </div>

                {/* Alt HUD Durum Çubuğu */}
                <div className="cctv-hud-bottom-bar">
                  <div className="cctv-storage-pill">
                    <span>💾 SD KART: 128 GB (%38 DOLU)</span>
                    <span className="telemetry-sep">•</span>
                    <span>☁️ BULUT ARŞİVİ: SENKRONİZE</span>
                  </div>

                  <div className="cctv-mode-tags">
                    {nightVision && <span className="cctv-ir-tag">🌙 IR GECE GÖRÜŞÜ</span>}
                    {audioEnabled && <span className="cctv-audio-tag">🔊 SES AKTİF (38 dB)</span>}
                  </div>
                </div>
              </div>

              {/* Klip Oynatılıyorsa Oynatma HUD'ı */}
              {playingClip && (
                <div className="cctv-playback-overlay">
                  <div className="playback-info">
                    <span className="playback-title">▶ OYNATILIYOR: {playingClip.title}</span>
                    <span className="playback-time">{playingClip.time}</span>
                  </div>
                  <div className="playback-bar-track">
                    <div className="playback-bar-fill" style={{ width: `${playProgress}%` }} />
                  </div>
                  <button 
                    type="button" 
                    className="playback-stop-btn"
                    onClick={() => setPlayingClip(null)}
                  >
                    Canlı Akışa Dön
                  </button>
                </div>
              )}
            </div>

            {/* Kamera Donanım Kontrol Çubuğu */}
            <div className="cctv-controls-bar">
              <button
                type="button"
                className={`cctv-action-btn ${isRecording ? 'stop-rec' : 'start-rec'}`}
                onClick={handleToggleRecord}
                title={isRecording ? 'Kaydı Durdur' : '24/7 Canlı Kayıt Başlat'}
              >
                {isRecording ? (
                  <>
                    <PauseIcon size={16} />
                    <span>Kaydı Durdur</span>
                  </>
                ) : (
                  <>
                    <PlayIcon size={16} />
                    <span>Kaydı Başlat</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="cctv-action-btn neutral"
                onClick={handleTakeSnapshot}
                title="Şu anki kareyi yakala ve galeriye kaydet"
              >
                <span>📸 Anlık Çekim</span>
              </button>

              <button
                type="button"
                className={`cctv-action-btn neutral ${nightVision ? 'active' : ''}`}
                onClick={() => setNightVision((prev) => !prev)}
                title="Kızılötesi Gece Görüşü Filtresini Aç/Kapat"
              >
                <span>🌙 Gece Görüşü</span>
              </button>

              <button
                type="button"
                className={`cctv-action-btn neutral ${audioEnabled ? 'active' : ''}`}
                onClick={() => setAudioEnabled((prev) => !prev)}
                title="İki Yönlü Ortam Sesini Dinle"
              >
                <span>{audioEnabled ? '🔊 Ses Açık' : '🔈 Ses Kapalı'}</span>
              </button>

              <button
                type="button"
                className="cctv-action-btn danger"
                onClick={handleTriggerAlarm}
                title="Mekânda caydırıcı siren ve flaşör çal"
              >
                <ShieldIcon size={16} />
                <span>🚨 Siren Çal</span>
              </button>
            </div>
          </div>

          {/* Sağ: Kayıt Geçmişi & Olay Arşivi */}
          <div className="cctv-archive-column">
            <div className="cctv-archive-header">
              <h4>Kayıt Arşivi & Olay Geçmişi</h4>
              <div className="cctv-archive-tabs">
                <button
                  type="button"
                  className={`archive-tab-btn ${activeTab === 'clips' ? 'active' : ''}`}
                  onClick={() => setActiveTab('clips')}
                >
                  Video Klipleri ({recordings.length})
                </button>
                <button
                  type="button"
                  className={`archive-tab-btn ${activeTab === 'snapshots' ? 'active' : ''}`}
                  onClick={() => setActiveTab('snapshots')}
                >
                  Fotoğraflar ({snapshots.length})
                </button>
              </div>
            </div>

            {/* Video Klipleri Listesi */}
            {activeTab === 'clips' ? (
              <div className="cctv-clips-list">
                {recordings.map((clip) => (
                  <div key={clip.id} className={`cctv-clip-card ${playingClip?.id === clip.id ? 'now-playing' : ''}`}>
                    <div className="clip-card-header">
                      <span className={`clip-badge ${clip.type}`}>
                        {clip.type === 'motion' ? '⚠️ HAREKET' : clip.type === 'person' ? '👤 İNSAN' : '🔴 DÖNGÜ'}
                      </span>
                      <span className="clip-room-tag">📍 {clip.room}</span>
                    </div>

                    <div className="clip-card-body">
                      <h5 className="clip-title">{clip.title}</h5>
                      <div className="clip-meta">
                        <span>🕒 {clip.time}</span>
                        <span>⏱ {clip.duration}</span>
                        <span>💾 {clip.size}</span>
                      </div>
                    </div>

                    <div className="clip-card-actions">
                      <button
                        type="button"
                        className="clip-btn play"
                        onClick={() => handlePlayClip(clip)}
                        title="Bu klibi oynat"
                      >
                        <PlayIcon size={14} />
                        <span>{playingClip?.id === clip.id ? 'Yeniden Oynat' : 'Oynat'}</span>
                      </button>

                      <button
                        type="button"
                        className="clip-btn neutral"
                        onClick={() => toast.success(`"${clip.title}" indirildi.`)}
                        title="Klibi İndir"
                      >
                        ⬇ İndir
                      </button>

                      <button
                        type="button"
                        className="clip-btn delete"
                        onClick={() => handleDeleteClip(clip.id)}
                        title="Klibi Arşivden Sil"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Anlık Fotoğraflar Listesi */
              <div className="cctv-snapshots-grid">
                {snapshots.map((snap) => (
                  <div key={snap.id} className="cctv-snap-card">
                    <div className="snap-preview-box">
                      <img src={roomImage} alt="Anlık Kare" />
                      <span className="snap-time-tag">{snap.time}</span>
                    </div>
                    <div className="snap-info">
                      <h6>{snap.title}</h6>
                      <span>{snap.room} • {snap.size}</span>
                      <button
                        type="button"
                        className="snap-download-btn"
                        onClick={() => toast.success('Fotoğraf tam çözünürlükte kaydedildi.')}
                      >
                        ⬇ İndir (1080P)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Alt Sistem ve Depolama Özeti */}
            <div className="cctv-storage-footer">
              <div className="storage-summary-row">
                <span className="storage-label">MicroSD Depolama (128 GB)</span>
                <span className="storage-val">%38 Dolu (48.6 GB)</span>
              </div>
              <div className="storage-progress-bar">
                <div className="storage-progress-fill" style={{ width: '38%' }} />
              </div>
              <div className="storage-extra-info">
                <span>🔄 14 Günlük Otomatik Döngü</span>
                <span>☁️ AWS S3 Şifreli Bulut</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
