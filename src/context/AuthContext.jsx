import React, { createContext, useContext, useState, useEffect } from 'react';
import { usersApi, notificationsApi } from '../services/api';

const AuthContext = createContext(null);
const STORAGE_KEY = 'aurahome_current_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  // Oturum durumunu senkronize tut
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  // Sekmeler arası oturum senkronizasyonu (Cross-tab session sync)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) {
        if (!e.newValue) {
          setUser(null);
        } else {
          try {
            setUser(JSON.parse(e.newValue));
          } catch {
            setUser(null);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  /**
   * Kullanıcı Girişi
   */
  const login = async (username, password) => {
    setLoading(true);
    try {
      const trimmedUser = username.trim();
      const users = await usersApi.getByUsername(trimmedUser);

      if (!users || users.length === 0) {
        throw new Error('Kullanıcı bulunamadı!');
      }

      const foundUser = users[0];
      if (foundUser.password !== password) {
        throw new Error('Hatalı şifre girdiniz!');
      }

      setUser(foundUser);

      // Giriş etkinliğini logla/bildirime kaydet
      try {
        await notificationsApi.create({
          userId: foundUser.id,
          message: `${foundUser.username} sisteme başarılı bir şekilde giriş yaptı.`,
          timestamp: new Date().toISOString(),
          isRead: false
        });
      } catch (logErr) {
        console.warn('Giriş logu kaydedilemedi:', logErr);
      }

      return { success: true, user: foundUser };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Yeni Kullanıcı Kaydı
   */
  const register = async (username, password, rooms = []) => {
    setLoading(true);
    try {
      const trimmedUser = username.trim();
      if (!trimmedUser || !password) {
        throw new Error('Kullanıcı adı ve şifre zorunludur!');
      }

      // Kullanıcı adı benzersizlik kontrolü
      const existing = await usersApi.getByUsername(trimmedUser);
      if (existing && existing.length > 0) {
        throw new Error('Bu kullanıcı adı zaten kullanılmaktadır!');
      }

      const defaultRooms = ['Salon', 'Mutfak', 'Yatak Odası', 'Banyo'];
      const newUser = await usersApi.create({
        username: trimmedUser,
        password: password,
        role: 'user',
        rooms: (rooms && rooms.length > 0) ? rooms : defaultRooms
      });

      // Kayıt etkinliği oluştur
      try {
        await notificationsApi.create({
          userId: newUser.id,
          message: `Yeni kullanıcı hesabı oluşturuldu: ${newUser.username}`,
          timestamp: new Date().toISOString(),
          isRead: false
        });
      } catch (logErr) {
        console.warn('Kayıt logu kaydedilemedi:', logErr);
      }

      setUser(newUser);
      return { success: true, user: newUser };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Çıkış Yap
   */
  const logout = async () => {
    if (user) {
      try {
        await notificationsApi.create({
          userId: user.id,
          message: `${user.username} sistemden çıkış yaptı.`,
          timestamp: new Date().toISOString(),
          isRead: false
        });
      } catch {
        // Hata durumunda çıkışı engelleme
      }
    }
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        loading,
        login,
        register,
        logout,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth, AuthProvider içinde kullanılmalıdır.');
  }
  return context;
}
