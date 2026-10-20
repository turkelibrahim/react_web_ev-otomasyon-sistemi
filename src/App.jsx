import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RulesPage from './pages/RulesPage';
import AdminPage from './pages/AdminPage';
import { startAutomationEngine, stopAutomationEngine } from './services/automationEngine';

function AppContent() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  // Otomasyon Motoru Yaşam Döngüsü (Oturum Açıldığında Başlat, Çıkışta Durdur)
  useEffect(() => {
    if (user) {
      startAutomationEngine(user, { toast });
    } else {
      stopAutomationEngine();
    }

    return () => {
      stopAutomationEngine();
    };
  }, [user, toast]);

  // URL Path takibi (Vanilla JS History API ile senkron)
  const getInitialPath = () => {
    const path = window.location.pathname;
    if (['/login', '/register', '/dashboard', '/rules', '/admin'].includes(path)) {
      return path;
    }
    return user ? '/dashboard' : '/login';
  };

  const [currentPath, setCurrentPath] = useState(getInitialPath);

  // Tarayıcı Geri/İleri (popstate) desteği
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setCurrentPath(path);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sayfa değiştirme fonksiyonu
  const navigate = (path) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    setCurrentPath(path);
  };

  // Yetkilendirme ve Korunan Rotalar (Route Guards)
  useEffect(() => {
    // 1. Giriş yapmamış kullanıcı korunan sayfalara erişmeye çalışırsa
    if (!user && (currentPath === '/dashboard' || currentPath === '/rules' || currentPath === '/admin')) {
      toast.warning('Bu sayfayı görüntülemek için lütfen önce giriş yapınız.', 'Giriş Gerekli');
      navigate('/login');
      return;
    }

    // 2. Normal kullanıcı /admin sayfasına girmeye çalışırsa
    if (user && currentPath === '/admin' && !isAdmin) {
      toast.error('Yetkisiz Erişim! Admin sayfasına yalnızca yöneticiler erişebilir.', 'Erişim Engellendi');
      navigate('/dashboard');
      return;
    }

    // 3. Giriş yapmış kullanıcı /login veya /register sayfasına giderse dashboard'a yönlendir
    if (user && (currentPath === '/login' || currentPath === '/register')) {
      navigate('/dashboard');
    }
  }, [user, isAdmin, currentPath, toast]);

  // Geçerli sayfayı render et
  const renderPage = () => {
    switch (currentPath) {
      case '/register':
        return <LoginPage initialMode="register" onNavigate={navigate} />;
      case '/login':
        return <LoginPage initialMode="login" onNavigate={navigate} />;
      case '/rules':
        return user ? <RulesPage onNavigate={navigate} /> : <LoginPage onNavigate={navigate} />;
      case '/admin':
        return user && isAdmin ? <AdminPage onNavigate={navigate} /> : <DashboardPage onNavigate={navigate} />;
      case '/dashboard':
      default:
        return user ? <DashboardPage onNavigate={navigate} /> : <LoginPage onNavigate={navigate} />;
    }
  };

  return (
    <div className="app-container">
      <Navbar currentPath={currentPath} onNavigate={navigate} />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
