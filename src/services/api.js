/**
 * AuraHome API Service
 * Vanilla JS fetch API ile json-server CRUD işlemleri
 * Kural: Kesinlikle Axios kullanılmamıştır.
 */

// Dinamik Host: Hem bilgisayarda (localhost) hem de telefonla aynı Wi-Fi üzerinden bağlanıldığında kusursuz çalışır
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return `http://${window.location.hostname}:5000`;
  }
  return 'http://localhost:5000';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Genel fetch yardımcı fonksiyonu
 * @param {string} endpoint 
 * @param {object} options 
 * @returns {Promise<any>}
 */
async function apiRequest(endpoint, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {})
    }
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      let errorMsg = `Sunucu Hatası: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          errorMsg = errorData.message;
        }
      } catch {
        // Metin olarak veya boş yanıt
      }
      throw new Error(errorMsg);
    }

    // 204 No Content durumunda null dön
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`API İsteği Hatası (${endpoint}):`, error);
    throw error;
  }
}

// ==========================================
// KULLANICI (USERS) API İŞLEMLERİ
// ==========================================
export const usersApi = {
  // Tüm kullanıcıları getir (Admin için)
  getAll: () => apiRequest('/users'),

  // ID ile kullanıcı getir
  getById: (id) => apiRequest(`/users/${id}`),

  // Kullanıcı adı ile sorgula (Giriş & Kayıt kontrolü)
  getByUsername: (username) => apiRequest(`/users?username=${encodeURIComponent(username)}`),

  // Yeni kullanıcı oluştur (Kayıt / Admin Ekleme)
  create: (userData) => apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),

  // Kullanıcı güncelle (Rol, şifre vb.)
  update: (id, userData) => apiRequest(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(userData)
  }),

  // Kullanıcı sil
  delete: (id) => apiRequest(`/users/${id}`, {
    method: 'DELETE'
  })
};

// ==========================================
// CİHAZLAR (DEVICES) API İŞLEMLERİ
// ==========================================
export const devicesApi = {
  // Kullanıcının cihazlarını getir
  getByUser: (userId) => apiRequest(`/devices?userId=${userId}`),

  // Tüm cihazları getir
  getAll: () => apiRequest('/devices'),

  // Tek cihaz getir
  getById: (id) => apiRequest(`/devices/${id}`),

  // Yeni cihaz ekle
  create: (deviceData) => apiRequest('/devices', {
    method: 'POST',
    body: JSON.stringify(deviceData)
  }),

  // Cihaz durumunu / ayarlarını güncelle
  update: (id, updates) => apiRequest(`/devices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  }),

  // Cihaz sil
  delete: (id) => apiRequest(`/devices/${id}`, {
    method: 'DELETE'
  })
};

// ==========================================
// OTOMASYON KURALLARI (RULES) API İŞLEMLERİ
// ==========================================
export const rulesApi = {
  // Kullanıcıya ait kuralları getir
  getByUser: (userId) => apiRequest(`/rules?userId=${userId}`),

  // Tüm kuralları getir
  getAll: () => apiRequest('/rules'),

  // Yeni kural ekle
  create: (ruleData) => apiRequest('/rules', {
    method: 'POST',
    body: JSON.stringify(ruleData)
  }),

  // Kural güncelle (örn: aktif/pasif)
  update: (id, updates) => apiRequest(`/rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  }),

  // Kural sil
  delete: (id) => apiRequest(`/rules/${id}`, {
    method: 'DELETE'
  })
};

// ==========================================
// BİLDİRİMLER VE LOGLAR (NOTIFICATIONS)
// ==========================================
export const notificationsApi = {
  // Kullanıcının bildirimlerini getir
  getByUser: (userId) => apiRequest(`/notifications?userId=${userId}&_sort=timestamp&_order=desc`),

  // Tüm logları/bildirimleri getir (Admin logları için)
  getAll: () => apiRequest('/notifications?_sort=timestamp&_order=desc'),

  // Yeni bildirim/log kaydet
  create: (notifData) => {
    const payload = {
      ...notifData,
      timestamp: notifData.timestamp || new Date().toISOString(),
      isRead: notifData.isRead ?? false
    };
    return apiRequest('/notifications', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Bildirimi okundu olarak işaretle
  markAsRead: (id) => apiRequest(`/notifications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isRead: true })
  }),

  // Bildirim sil
  delete: (id) => apiRequest(`/notifications/${id}`, {
    method: 'DELETE'
  })
};
