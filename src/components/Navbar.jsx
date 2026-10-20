import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { notificationsApi } from '../services/api';
import Modal from './Modal';
import { 
  DashboardIcon, 
  SlidersIcon, 
  ShieldIcon, 
  BellIcon, 
  LogOutIcon, 
  UserIcon,
  CheckIcon,
  XIcon
} from './Icons';

export default function Navbar({ currentPath, onNavigate }) {
  const { user, isAdmin, logout } = useAuth();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Bildirimleri yükle
  const loadNotifications = async () => {
    if (!user) return;
    try {
      // Eğer admin ise tüm logları/bildirimleri, normal kullanıcı ise kendi bildirimlerini getir
      const data = isAdmin 
        ? await notificationsApi.getAll() 
        : await notificationsApi.getByUser(user.id);
      setNotifications(data || []);
    } catch {
      // Sessizce geç
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 8000);
    return () => clearInterval(interval);
  }, [user, isAdmin]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    try {
      const unreadList = notifications.filter((n) => !n.isRead);
      await Promise.all(unreadList.map((n) => notificationsApi.markAsRead(n.id)));
      toast.success('Tüm bildirimler okundu olarak işaretlendi.');
      loadNotifications();
    } catch {
      toast.error('Bildirimler güncellenirken hata oluştu.');
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.info('Başarıyla çıkış yapıldı.');
    onNavigate('/login');
  };

  return (
    <>
      <header className="navbar">
        <div className="navbar-inner">
          {/* Logo */}
          <div 
            className="brand-logo" 
            style={{ cursor: 'pointer' }}
            onClick={() => onNavigate(user ? '/dashboard' : '/login')}
          >
            <div className="brand-icon-box">
              <DashboardIcon size={22} />
            </div>
            <span>AuraHome</span>
          </div>

          {/* Menü Linkleri (Desktop) */}
          {user && (
            <nav className="nav-links">
              <button
                type="button"
                className={`nav-link ${currentPath === '/dashboard' ? 'active' : ''}`}
                onClick={() => onNavigate('/dashboard')}
              >
                <DashboardIcon size={18} />
                <span>Cihazlarım</span>
              </button>

              <button
                type="button"
                className={`nav-link ${currentPath === '/rules' ? 'active' : ''}`}
                onClick={() => onNavigate('/rules')}
              >
                <SlidersIcon size={18} />
                <span>Otomasyon Kuralları</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  className={`nav-link ${currentPath === '/admin' ? 'active' : ''}`}
                  onClick={() => onNavigate('/admin')}
                >
                  <ShieldIcon size={18} />
                  <span>Admin Paneli</span>
                  <span className="admin-badge">Yönetici</span>
                </button>
              )}
            </nav>
          )}

          {/* Sağ Alan: Bildirim & Kullanıcı & Çıkış */}
          <div className="nav-user-actions">
            {user ? (
              <>
                {/* Bildirim Çanı */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="action-btn-sm"
                    title="Bildirimler"
                    onClick={() => setShowNotifications(!showNotifications)}
                    style={{ position: 'relative' }}
                    aria-label="Bildirimler"
                  >
                    <BellIcon size={20} />
                    {unreadCount > 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          width: '10px',
                          height: '10px',
                          backgroundColor: '#f43f5e',
                          borderRadius: '50%',
                          border: '2px solid #0e1424'
                        }}
                      />
                    )}
                  </button>

                  {/* Bildirim Dropdown Popover */}
                  {showNotifications && (
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: '46px',
                        width: '320px',
                        background: '#0e1422',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '14px',
                        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6)',
                        zIndex: 1000,
                        padding: '16px',
                        backdropFilter: 'blur(16px)'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '12px',
                          paddingBottom: '8px',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                        }}
                      >
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                          Bildirimler ({unreadCount})
                        </h4>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllRead}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--accent-cyan)',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            Tümünü Oku
                          </button>
                        )}
                      </div>

                      <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {notifications.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            Yeni bildirim bulunmuyor.
                          </div>
                        ) : (
                          notifications.slice(0, 10).map((n) => (
                            <div
                              key={n.id}
                              style={{
                                padding: '10px 12px',
                                background: n.isRead ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 210, 255, 0.06)',
                                border: n.isRead ? '1px solid rgba(255, 255, 255, 0.04)' : '1px solid rgba(0, 210, 255, 0.2)',
                                borderRadius: '8px',
                                fontSize: '0.83rem'
                              }}
                            >
                              <div style={{ color: n.isRead ? 'var(--text-muted)' : 'var(--text-main)', marginBottom: '4px' }}>
                                {n.message}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)' }}>
                                {n.timestamp ? new Date(n.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobil Karekod Butonu */}
                <button
                  type="button"
                  className="action-btn-sm"
                  title="Telefonla Bağlan (Karekod)"
                  onClick={() => setShowQrModal(true)}
                  style={{ fontSize: '1rem' }}
                  aria-label="Mobil Karekod"
                >
                  📱
                </button>

                {/* Kullanıcı Rozeti */}
                <div className="user-profile-chip">
                  <div className="user-avatar-circle">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="user-name-text">{user.username}</span>
                  {user.role === 'admin' ? (
                    <span className="admin-badge">Admin</span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>Kullanıcı</span>
                  )}
                </div>

                {/* Çıkış Butonu */}
                <button
                  type="button"
                  className="btn-logout"
                  onClick={handleLogout}
                  title="Güvenli Çıkış"
                >
                  <LogOutIcon size={16} />
                  <span>Çıkış</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onNavigate('/login')}
              >
                Giriş Yap
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobil Bağlantı Karekodu Modalı */}
      <Modal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        title="📱 Mobil Cihazınızla Bağlanın"
      >
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Telefonunuzun kamerasını aşağıdaki karekoda tutarak sistemi hemen cep telefonunuzda açabilirsiniz:
          </p>

          <div
            style={{
              padding: '12px',
              background: '#ffffff',
              borderRadius: '16px',
              display: 'inline-block',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
            }}
          >
            <img
              src="/qrcode.png"
              alt="Mobil Bağlantı Karekodu"
              width="220"
              height="220"
              style={{ display: 'block', borderRadius: '8px' }}
            />
          </div>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: 'var(--accent-cyan)' }}>
            http://10.62.14.41:5173/
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
            (Telefonunuz bilgisayarınız ile aynı Wi-Fi ağına bağlı olmalıdır)
          </div>
        </div>
      </Modal>

      {/* Mobil Alt Menü Barı (Mobil Cihazlarda Aktif) */}
      {user && (
        <nav className="mobile-bottom-nav">
          <button
            type="button"
            className={`mobile-nav-item ${currentPath === '/dashboard' ? 'active' : ''}`}
            onClick={() => onNavigate('/dashboard')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <DashboardIcon size={20} />
            <span>Cihazlar</span>
          </button>

          <button
            type="button"
            className={`mobile-nav-item ${currentPath === '/rules' ? 'active' : ''}`}
            onClick={() => onNavigate('/rules')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <SlidersIcon size={20} />
            <span>Kurallar</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              className={`mobile-nav-item ${currentPath === '/admin' ? 'active' : ''}`}
              onClick={() => onNavigate('/admin')}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <ShieldIcon size={20} />
              <span>Admin</span>
            </button>
          )}

          <button
            type="button"
            className="mobile-nav-item"
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-rose)' }}
          >
            <LogOutIcon size={20} />
            <span>Çıkış</span>
          </button>
        </nav>
      )}
    </>
  );
}
