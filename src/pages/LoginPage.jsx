import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DashboardIcon, UserIcon, LockIcon, XIcon } from '../components/Icons';
import Modal from '../components/Modal';

const HOUSE_TEMPLATES = {
  '1plus1': {
    name: '1+1 Daire (3 Oda)',
    rooms: ['Salon', 'Yatak Odası', 'Mutfak']
  },
  '2plus1': {
    name: '2+1 Standart Ev (4 Oda)',
    rooms: ['Salon', 'Yatak Odası', 'Çalışma Odası', 'Mutfak', 'Banyo']
  },
  '3plus1': {
    name: '3+1 Geniş Ev (6 Oda)',
    rooms: ['Salon', 'Ebeveyn Yatak Odası', 'Çocuk Odası', 'Mutfak', 'Banyo', 'Balkon']
  },
  'villa': {
    name: 'Villa / Müstakil (7 Alan)',
    rooms: ['Salon', 'Mutfak', 'Yatak Odası', 'Banyo', 'Bahçe', 'Garaj', 'Balkon']
  }
};

export default function LoginPage({ initialMode = 'login', onNavigate }) {
  const [mode, setMode] = useState(initialMode); // 'login' veya 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedHouseType, setSelectedHouseType] = useState('2plus1');
  const [customRooms, setCustomRooms] = useState(HOUSE_TEMPLATES['2plus1'].rooms);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register } = useAuth();
  const { toast } = useToast();

  const handleHouseTypeChange = (type) => {
    setSelectedHouseType(type);
    if (HOUSE_TEMPLATES[type]) {
      setCustomRooms(HOUSE_TEMPLATES[type].rooms);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Form doğrulama kontrolü
    if (!username.trim() || !password.trim()) {
      toast.warning('Lütfen kullanıcı adı ve şifre alanlarını eksiksiz doldurunuz.', 'Eksik Form Alanı');
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        toast.error('Girdiğiniz şifreler birbiriyle eşleşmiyor!', 'Şifre Uyuşmazlığı');
        return;
      }
      if (password.length < 3) {
        toast.warning('Şifreniz en az 3 karakter olmalıdır.', 'Güvenlik Uyarısı');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await login(username, password);
        if (res.success) {
          toast.success(`Hoş geldiniz, ${res.user.username}!`, 'Giriş Başarılı');
          onNavigate(res.user.role === 'admin' ? '/admin' : '/dashboard');
        }
      } else {
        const res = await register(username, password, customRooms);
        if (res.success) {
          toast.success('Eviniz ve odalarınız başarıyla oluşturuldu!', 'Kayıt Başarılı');
          onNavigate('/dashboard');
        }
      }
    } catch (err) {
      toast.error(err.message || 'Bir hata meydana geldi.', 'İşlem Başarısız');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Demo kullanıcı ile hızlı giriş
  const handleQuickLogin = (demoUser, demoPass) => {
    setUsername(demoUser);
    setPassword(demoPass);
  };

  const mobileUrl = 'http://10.62.14.41:5173/';
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(mobileUrl)}`;

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-icon-box">
            <DashboardIcon size={28} />
          </div>
          <h2>AuraHome Otomasyon</h2>
          <p>
            {mode === 'login'
              ? 'Akıllı evinizi kontrol etmek için giriş yapın'
              : 'Evinizin planını ve odalarını belirleyerek kayıt olun'}
          </p>
        </div>

        {/* Giriş / Kayıt Sekmeleri */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              onNavigate('/login');
            }}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              onNavigate('/register');
            }}
          >
            Yeni Ev Kaydı
          </button>
        </div>

        {/* Giriş/Kayıt Formu */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="username-input">Kullanıcı Adı</label>
            <input
              id="username-input"
              type="text"
              className="form-input"
              placeholder="Örn: ahmet veya admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">Şifre</label>
            <input
              id="password-input"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {mode === 'register' && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="confirm-password-input">Şifre Tekrar</label>
                <input
                  id="confirm-password-input"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              {/* Oda ve Ev Tipi Seçimi */}
              <div className="form-group">
                <label className="form-label" htmlFor="house-type-select">
                  Ev Tipi & Oda Yapılandırması
                </label>
                <select
                  id="house-type-select"
                  className="form-select"
                  value={selectedHouseType}
                  onChange={(e) => handleHouseTypeChange(e.target.value)}
                >
                  {Object.entries(HOUSE_TEMPLATES).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Oluşturulacak Odaların Önizlemesi */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Oluşturulacak Odalar:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {customRooms.map((roomName, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        background: 'rgba(0, 210, 255, 0.1)',
                        border: '1px solid rgba(0, 210, 255, 0.25)',
                        fontSize: '0.78rem',
                        color: 'var(--accent-cyan)'
                      }}
                    >
                      {roomName}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '6px' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'İşleniyor...' : mode === 'login' ? 'Giriş Yap' : 'Evimi ve Odalarımı Oluştur'}
          </button>
        </form>

        {/* Karekod Butonu */}
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '0.86rem', gap: '8px' }}
            onClick={() => setIsQrModalOpen(true)}
          >
            <span>📱</span>
            <span>Telefonda Aç (Mobil Karekod)</span>
          </button>
        </div>

        {/* Hızlı Demo Bilgileri (Öğretim görevlisi / Test için kolaylık) */}
        <div className="demo-credentials-box">
          <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
            Hızlı Test Hesapları (db.json):
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span><strong>admin</strong> / 123 (Yönetici)</span>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
              onClick={() => handleQuickLogin('admin', '123')}
            >
              Doldur
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><strong>ahmet</strong> / 123 (Standart Kullanıcı)</span>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
              onClick={() => handleQuickLogin('ahmet', '123')}
            >
              Doldur
            </button>
          </div>
        </div>
      </div>

      {/* Mobil Karekod Modalı */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="Mobil Cihazınızla Bağlanın"
      >
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Telefonunuzun kamerasını aşağıdaki karekoda tutarak sistemi anında mobil uygulama olarak açabilirsiniz:
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

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
            {mobileUrl}
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
            (Telefonunuz bilgisayar ile aynı Wi-Fi ağına bağlı olmalıdır)
          </div>
        </div>
      </Modal>
    </div>
  );
}
