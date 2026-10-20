/**
 * AuraHome - Akıllı Ev Otomasyon Motoru (Automation Engine)
 * 
 * Tarayıcı içinde çalışan, veritabanına bağlı kural yürütücü servis.
 * - Kullanıcı oturumu açıkken arka planda çalışır.
 * - Zaman bazlı (HH:mm) otomasyon kurallarını tarar ve eşleştiğinde tetikler.
 * - Aynı kuralın aynı gün/dakikada mükerrer (duplicate) çalışmasını localStorage ile engeller.
 * - React StrictMode ve çift interval riskine karşı korumalı tekil (singleton) yaşam döngüsüne sahiptir.
 * - Manuel ("Şimdi Çalıştır") ve otomatik yürütme için ortak `executeRule` mantığını sunar.
 */

import { rulesApi, devicesApi, notificationsApi } from './api.js';

// Dinleyici aboneleri (Event Listeners)
const listeners = new Set();

// Yürütülmekte olan kural ID'leri (In-flight concurrency kilidi)
const inFlightRuleIds = new Set();

// Motor Durumu
const engineState = {
  isRunning: false,
  userId: null,
  intervalId: null,
  toast: null,
  getTimeFn: null
};

/**
 * Zaman dizgesini HH:mm formatında normalize eder
 */
export const normalizeTime = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const parts = timeStr.trim().split(':');
  if (parts.length !== 2) return timeStr.trim();
  const h = parts[0].padStart(2, '0');
  const m = parts[1].padStart(2, '0');
  return `${h}:${m}`;
};

/**
 * Güncel sistem saatini döner (Test edilebilirlik için getTimeFn destekler)
 */
export const getCurrentTimeString = (customTimeFn = null) => {
  if (typeof customTimeFn === 'function') {
    return normalizeTime(customTimeFn());
  }
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Günün YYYY-MM-DD tarihini döner
 */
export const getCurrentDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Tekrarlanmayı önleme (Deduplication) anahtarını üretir
 */
export const getDedupKey = (ruleId, dateStr, timeStr) => {
  return `aurahome_rule_run_${ruleId}_${dateStr}_${normalizeTime(timeStr)}`;
};

/**
 * Kuralın bu dakika içinde daha önce çalışıp çalışmadığını kontrol eder
 */
export const hasRuleRunInCurrentMinute = (ruleId, dateStr, timeStr) => {
  try {
    const key = getDedupKey(ruleId, dateStr, timeStr);
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
};

/**
 * Kuralın bu dakika için başarıyla çalıştırıldığını kaydeder
 */
export const markRuleAsRunInCurrentMinute = (ruleId, dateStr, timeStr) => {
  try {
    const key = getDedupKey(ruleId, dateStr, timeStr);
    localStorage.setItem(key, String(Date.now()));
  } catch (e) {
    console.warn('Deduplication kaydı localStorage üzerine yazılamadı:', e);
  }
};

/**
 * Çoklu sekme için kural bazlı kilit edinme (Atomic Multi-Tab Lock)
 * 
 * 1. Web Locks API (navigator.locks): Modern tarayıcılarda (Chrome, Edge, Firefox, Safari) 
 *    sekme ve worker'lar arasında atomik sistem/origin seviyesinde kilitleme sağlar.
 * 2. Fallback: navigator.locks bulunmayan ortamlarda localStorage tabanlı zaman damgalı kilit uygular.
 */
export async function withMultiTabLock(lockKey, callback) {
  // 1. Web Locks API desteği (Modern tarayıcılar: Chrome 69+, Edge 79+, Safari 15.4+, Firefox 96+)
  if (typeof navigator !== 'undefined' && navigator.locks && typeof navigator.locks.request === 'function') {
    return new Promise((resolve) => {
      navigator.locks.request(lockKey, { ifAvailable: true }, async (lock) => {
        if (!lock) {
          // Başka bir sekme bu kilidi halihazırda tutuyor; mükerrer çalışmayı önle
          resolve({ acquired: false, skippedReason: 'locked_by_other_tab' });
          return;
        }
        try {
          const result = await callback();
          resolve({ acquired: true, result });
        } catch (err) {
          resolve({ acquired: true, error: err });
        }
      }).catch((err) => {
        resolve({ acquired: false, error: err });
      });
    });
  }

  // 2. Fallback: localStorage tabanlı token mutex kilidi (Web Locks API olmayan ortamlar için)
  const storageLockKey = `aurahome_tab_lock_${lockKey}`;
  const now = Date.now();
  const token = `${Math.random().toString(36).slice(2)}_${now}`;

  try {
    const existing = localStorage.getItem(storageLockKey);
    if (existing) {
      const parts = existing.split('_');
      const lockTime = Number(parts[parts.length - 1]);
      // Kilit son 15 saniye içinde alınmışsa geçerlidir, diğer sekme atlasın
      if (now - lockTime < 15000) {
        return { acquired: false, skippedReason: 'locked_by_other_tab_storage' };
      }
    }

    localStorage.setItem(storageLockKey, token);
    // Küçük bir bekleme ile diğer sekmelerin yazma çakışmasını doğrula (30ms)
    await new Promise((r) => setTimeout(r, 30));
    const currentHolder = localStorage.getItem(storageLockKey);
    if (currentHolder !== token) {
      // Başka bir sekme bizim üzerimize yazdı, yarış durumunda çekil
      return { acquired: false, skippedReason: 'contention_lost' };
    }
  } catch {
    // localStorage erişilemezse devam et
  }

  try {
    const result = await callback();
    return { acquired: true, result };
  } catch (err) {
    return { acquired: true, error: err };
  } finally {
    try {
      const currentHolder = localStorage.getItem(storageLockKey);
      if (currentHolder === token) {
        localStorage.removeItem(storageLockKey);
      }
    } catch {
      // Sessiz
    }
  }
}

/**
 * Cihaz güncellendiğinde tüm abonelere bildirir
 */
const notifyDeviceUpdated = (device) => {
  listeners.forEach((callback) => {
    try {
      callback(device);
    } catch (err) {
      console.error('Cihaz güncelleme dinleyici hatası:', err);
    }
  });

  // Global window event'i de fırlat (Bağımsız bileşen senkronizasyonu için)
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('aurahome:device-updated', { detail: device }));
    } catch {
      // Sessizce devam et
    }
  }
};

/**
 * Ortak Kural Yürütme Fonksiyonu
 * Hem zamanlayıcı tetiklemesi hem de "Şimdi Çalıştır" butonu tarafından kullanılır.
 * 
 * @param {object} rule - Yürütülecek otomasyon kuralı
 * @param {object} context - { user, devices, toast, isManual }
 * @returns {Promise<{ success: boolean, device?: object, error?: string }>}
 */
export async function executeRule(rule, context = {}) {
  const { user, devices = [], toast = null, isManual = false } = context;

  if (!rule || !user) {
    return { success: false, error: 'Eksik kural veya kullanıcı parametresi' };
  }

  // Kullanıcı sahipliğini doğrula
  if (String(rule.userId) !== String(user.id)) {
    const msg = `Yetkisiz erişim: #${rule.id} numaralı kural bu kullanıcıya ait değil!`;
    if (toast) toast.error(msg, 'Yetki Hatası');
    return { success: false, error: msg, isPermanentError: true };
  }

  // Hedef cihazı tespit et (Önce sağlanan listeden, yoksa doğrudan API'den)
  let targetDev = devices.find((d) => String(d.id) === String(rule.deviceId));
  if (!targetDev) {
    try {
      targetDev = await devicesApi.getById(rule.deviceId);
    } catch {
      targetDev = null;
    }
  }

  // Cihaz bulunamadıysa veya başka kullanıcıya aitse hata yönetimi
  if (!targetDev || String(targetDev.userId) !== String(user.id)) {
    const errMsg = `Otomasyon Kuralı Hatası: #${rule.deviceId} ID'li hedef cihaz bulunamadı veya erişim yetkiniz yok.`;
    if (toast) toast.error(errMsg, 'Hedef Cihaz Bulunamadı');

    try {
      await notificationsApi.create({
        userId: user.id,
        message: `Otomasyon hatası: Saat ${rule.condition} kuralı hedef cihazı (#${rule.deviceId}) bulamadı veya yetkisiz erişim.`,
        timestamp: new Date().toISOString()
      });
    } catch {
      // Hata logu ana akışı kesmesin
    }

    return { success: false, error: errMsg, isPermanentError: true };
  }

  // Hedef eylemi belirle
  const isTurnOn = rule.action === 'turn_on';
  const newStatus = isTurnOn;

  try {
    // 1. Asıl işlem: API servisi üzerinden cihazın durumunu güncelle
    const updated = await devicesApi.update(targetDev.id, { status: newStatus });
    const finalDevice = updated || { ...targetDev, status: newStatus };

    // Başarılı durumu React bileşenlerine ve abonelere yay
    notifyDeviceUpdated(finalDevice);

    const actionText = newStatus ? 'AÇILDI' : 'KAPATILDI';
    const triggerSource = isManual ? 'Manuel olarak' : `Saat ${rule.condition} kuralıyla`;

    // 2. İkincil işlem: Bildirim ve log kaydet (Bildirim API hatası cihaz güncellemesini iptal etmemeli!)
    try {
      await notificationsApi.create({
        userId: user.id,
        message: `Otomasyon kuralı çalıştı: ${targetDev.name} (${targetDev.room || 'Oda'}) ${triggerSource} ${actionText}.`,
        timestamp: new Date().toISOString()
      });
    } catch (notifErr) {
      console.warn('Otomasyon bildirim kaydı kaydedilemedi (Cihaz durumu korundu):', notifErr);
    }

    // 3. Kullanıcıya Toast bildirimi göster
    if (toast) {
      toast.success(
        `"${targetDev.name}" cihazı ${triggerSource} başarıyla ${actionText.toLowerCase()}.`,
        'Otomasyon Yürütüldü'
      );
    }

    return { success: true, device: finalDevice };
  } catch (err) {
    const errorMsg = `Otomasyon yürütme hatası: "${targetDev.name}" güncellenemedi (${err.message})`;
    if (toast) toast.error(errorMsg, 'İşlem Başarısız');
    return { success: false, error: errorMsg };
  }
}

/**
 * Belirli bir anda kullanıcının kurallarını kontrol edip zamanı gelenleri yürütür.
 */
export async function checkRulesOnce(user, options = {}) {
  if (!user || !user.id) return [];

  const toast = options.toast || engineState.toast;
  const getTimeFn = options.getTimeFn || engineState.getTimeFn;

  const currentTime = getCurrentTimeString(getTimeFn);
  const currentDate = getCurrentDateString();

  try {
    // Kullanıcının güncel kurallarını ve cihazlarını sunucudan çek
    const [userRules, userDevices] = await Promise.all([
      rulesApi.getByUser(user.id),
      devicesApi.getByUser(user.id)
    ]);

    if (!userRules || userRules.length === 0) {
      return [];
    }

    const executedResults = [];

    // Saati eşleşen kuralları filtrele
    for (const rule of userRules) {
      try {
        const ruleTime = normalizeTime(rule.condition);

        // Kural zamanı şu anki dakikaya eşit mi?
        if (ruleTime === currentTime) {
          // 1. Aşama Hızlı Dedup Kontrolü
          if (hasRuleRunInCurrentMinute(rule.id, currentDate, currentTime)) {
            continue; // Mükerrer çalışmayı önle
          }

          // Halihazırda bu sekmede yürütülmekte olan bir kural mı?
          if (inFlightRuleIds.has(rule.id)) {
            continue; // Concurrency kilidi
          }

          const lockKey = `aurahome_rule_${rule.id}_${currentDate}_${currentTime}`;

          // 2. Çoklu Sekme Atomik Kilidi (Double-Checked Locking)
          await withMultiTabLock(lockKey, async () => {
            // Kilit edinildikten sonra tekrar kontrol et (Sekmeler arası yarış durumunu kesin önler)
            if (hasRuleRunInCurrentMinute(rule.id, currentDate, currentTime)) {
              return;
            }

            inFlightRuleIds.add(rule.id);

            try {
              const result = await executeRule(rule, {
                user,
                devices: userDevices || [],
                toast,
                isManual: false
              });

              // Yürütme başarılıysa veya kalıcı konfigürasyon hatasıysa bu dakika için deduplication kaydı bırak
              // Böylece aynı dakikada 10 saniyede bir mükerrer cihaz eylemi veya bildirim üretilmez
              if (result && (result.success || result.isPermanentError)) {
                markRuleAsRunInCurrentMinute(rule.id, currentDate, currentTime);
              }

              executedResults.push({ ruleId: rule.id, result });
            } finally {
              inFlightRuleIds.delete(rule.id);
            }
          });
        }
      } catch (ruleErr) {
        // Bir kuraldaki beklenmedik hata diğer kuralların kontrolünü durdurmamalı
        console.error(`Kural kontrol hatası (Kural ID: ${rule?.id}):`, ruleErr);
      }
    }

    return executedResults;
  } catch (err) {
    console.warn('Otomasyon motoru kural kontrolü sırasında hata oluştu:', err);
    return [];
  }
}

/**
 * Otomasyon motorunu başlatır (Singleton)
 * 
 * @param {object} user - Giriş yapan kullanıcı
 * @param {object} options - { toast, intervalMs = 10000, getTimeFn }
 */
export function startAutomationEngine(user, options = {}) {
  if (!user || !user.id) return;

  // Aynı kullanıcı için zaten aktif bir zamanlayıcı varsa tekrar interval kurma (Strict Mode koruması)
  if (engineState.isRunning && engineState.userId === user.id) {
    if (options.toast) engineState.toast = options.toast;
    if (options.getTimeFn) engineState.getTimeFn = options.getTimeFn;
    return;
  }

  // Farklı bir kullanıcıysa önceki motoru güvenle sonlandır
  stopAutomationEngine();

  engineState.isRunning = true;
  engineState.userId = user.id;
  engineState.toast = options.toast || null;
  engineState.getTimeFn = options.getTimeFn || null;

  const intervalMs = options.intervalMs || 10000;

  // Motor başlar başlamaz ilk kontrolü yap
  checkRulesOnce(user, options);

  // Periyodik kontrol zamanlayıcısı
  engineState.intervalId = setInterval(() => {
    checkRulesOnce(user, {
      toast: engineState.toast,
      getTimeFn: engineState.getTimeFn
    });
  }, intervalMs);
}

/**
 * Otomasyon motorunu durdurur ve kaynakları temizler
 */
export function stopAutomationEngine() {
  if (engineState.intervalId) {
    clearInterval(engineState.intervalId);
    engineState.intervalId = null;
  }
  engineState.isRunning = false;
  engineState.userId = null;
  engineState.toast = null;
  engineState.getTimeFn = null;
  inFlightRuleIds.clear();
}

/**
 * Motorun şu an çalışıp çalışmadığını sorgular
 */
export function isAutomationEngineRunning() {
  return engineState.isRunning;
}

/**
 * Cihaz güncelleme dinleyicisi ekler
 * @param {function} callback - (updatedDevice) => void
 * @returns {function} Aboneliği iptal etme fonksiyonu (unsubscribe)
 */
export function onAutomationDeviceUpdate(callback) {
  if (typeof callback === 'function') {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }
  return () => {};
}
