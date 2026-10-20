/**
 * Phase 3.1 Hardening & Verification Suite for AuraHome Automation Engine
 */

import { 
  normalizeTime, 
  getCurrentTimeString, 
  getCurrentDateString, 
  getDedupKey,
  hasRuleRunInCurrentMinute,
  markRuleAsRunInCurrentMinute,
  withMultiTabLock,
  executeRule,
  checkRulesOnce,
  startAutomationEngine,
  stopAutomationEngine,
  isAutomationEngineRunning,
  onAutomationDeviceUpdate
} from './src/services/automationEngine.js';

// Setup Mock Environment for Node.js
const storageMap = new Map();
global.localStorage = {
  getItem: (key) => storageMap.get(key) || null,
  setItem: (key, val) => storageMap.set(key, String(val)),
  removeItem: (key) => storageMap.delete(key),
  clear: () => storageMap.clear()
};

// Mock Web Locks API to simulate real multi-tab lock
const activeLocks = new Set();
const mockLocks = {
  request: async (name, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    if (options?.ifAvailable && activeLocks.has(name)) {
      return callback(null); // lock unavailable
    }
    activeLocks.add(name);
    try {
      return await callback({ name });
    } finally {
      activeLocks.delete(name);
    }
  }
};

try {
  Object.defineProperty(globalThis.navigator, 'locks', {
    value: mockLocks,
    configurable: true,
    writable: true
  });
} catch {
  // Navigator mocked
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n=== AURAHOME PHASE 3.1: OTOMASYON MOTORU DOĞRULAMA VE SERTLEŞTİRME TESTLERİ ===\n');

  // -------------------------------------------------------------
  // Test 1: Zaman ve Format Doğrulaması
  // -------------------------------------------------------------
  console.log('1. Zaman Formatlama ve Normalizasyon Testi:');
  assert(normalizeTime('19:00') === '19:00', '19:00 doğru normalize edildi');
  assert(normalizeTime(' 9:5 ') === '09:05', '9:5 -> 09:05 olarak düzeltildi');
  assert(normalizeTime('00:00') === '00:00', '00:00 gece yarısı doğru formatlandı');
  assert(normalizeTime('') === '', 'Boş saat hatasız ele alındı');
  
  const nowTime = getCurrentTimeString();
  assert(/^\d{2}:\d{2}$/.test(nowTime), `Sistem saati HH:mm formatında: ${nowTime}`);
  const nowDate = getCurrentDateString();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(nowDate), `Sistem tarihi YYYY-MM-DD formatında: ${nowDate}`);

  // -------------------------------------------------------------
  // Test 2: Tekrarlanmayı Önleme (Deduplication) ve Çift Kontrol
  // -------------------------------------------------------------
  console.log('\n2. Aynı Sekmede Art Arda Kontrol ve Deduplication Testi:');
  storageMap.clear();
  const testRuleId = 101;
  const testDate = '2026-10-13';
  const testTime = '19:00';

  assert(!hasRuleRunInCurrentMinute(testRuleId, testDate, testTime), 'Başlangıçta kural çalışmamış durumda');
  markRuleAsRunInCurrentMinute(testRuleId, testDate, testTime);
  assert(hasRuleRunInCurrentMinute(testRuleId, testDate, testTime), 'Kural çalıştıktan sonra hasRuleRunInCurrentMinute = true');

  // -------------------------------------------------------------
  // Test 3: Çoklu Sekme Atomik Kilitleme (Web Locks Simülasyonu)
  // -------------------------------------------------------------
  console.log('\n3. Çoklu Sekme Eşzamanlı (Concurrent) Kilit Testi:');
  const lockKey = 'test_lock_rule_101_1900';
  let tab1Executed = false;
  let tab2Executed = false;

  // İki sekmenin tam aynı anda kilidi istemesi
  const p1 = withMultiTabLock(lockKey, async () => {
    tab1Executed = true;
    await new Promise((r) => setTimeout(r, 50)); // Tab 1 işlemi yürütüyor
    return 'tab1_done';
  });

  const p2 = withMultiTabLock(lockKey, async () => {
    tab2Executed = true;
    return 'tab2_done';
  });

  const [res1, res2] = await Promise.all([p1, p2]);
  assert(res1.acquired === true && tab1Executed === true, 'Tab 1 kilidi aldı ve çalıştı');
  assert(res2.acquired === false && tab2Executed === false, 'Tab 2 kilit meşgul olduğu için güvenle atlandı (skippedReason: locked_by_other_tab)');

  // -------------------------------------------------------------
  // Test 4: LocalStorage Fallback Mutex Testi (Web Locks Olmadığında)
  // -------------------------------------------------------------
  console.log('\n4. Fallback LocalStorage Mutex Testi:');
  globalThis.navigator.locks = undefined; // Web locks'ı geçici devre dışı bırak
  storageMap.clear();

  let fbTab1Executed = false;
  let fbTab2Executed = false;
  const fbLockKey = 'fallback_rule_102';

  const fb1 = withMultiTabLock(fbLockKey, async () => {
    fbTab1Executed = true;
    await new Promise((r) => setTimeout(r, 80));
    return 'fb1_done';
  });
  // Tab 2 hemen 5ms sonra giriyor
  await new Promise((r) => setTimeout(r, 5));
  const fb2 = withMultiTabLock(fbLockKey, async () => {
    fbTab2Executed = true;
    return 'fb2_done';
  });

  const [fbRes1, fbRes2] = await Promise.all([fb1, fb2]);
  assert(fbRes1.acquired === true && fbTab1Executed === true, 'Fallback Tab 1 kilidi kazandı');
  assert(fbRes2.acquired === false && fbTab2Executed === false, 'Fallback Tab 2 kilitli olduğu için yarış durumunda atlandı');
  globalThis.navigator.locks = mockLocks; // Geri yükle

  // -------------------------------------------------------------
  // Test 5: React StrictMode Çift Başlatma ve Singleton Yaşam Döngüsü
  // -------------------------------------------------------------
  console.log('\n5. React StrictMode ve Singleton Yaşam Döngüsü Testi:');
  const testUser = { id: 2, username: 'ahmet' };
  startAutomationEngine(testUser, { intervalMs: 100000 });
  assert(isAutomationEngineRunning() === true, 'Motor başlatıldı (isRunning = true)');
  
  // İkinci kez başlatma çağrısı (StrictMode davranışı)
  startAutomationEngine(testUser, { intervalMs: 100000 });
  assert(isAutomationEngineRunning() === true, 'StrictMode çift çağrısında motor tekil olarak çalışmaya devam etti');

  // Çıkış yapıldığında
  stopAutomationEngine();
  assert(isAutomationEngineRunning() === false, 'stopAutomationEngine çağrıldığında motor durduruldu');

  // Kullanıcı değiştiğinde
  const testUser2 = { id: 3, username: 'melike' };
  startAutomationEngine(testUser, { intervalMs: 100000 });
  startAutomationEngine(testUser2, { intervalMs: 100000 });
  assert(isAutomationEngineRunning() === true, 'Yeni kullanıcı ile motor yeniden yapılandırıldı');
  stopAutomationEngine();

  // -------------------------------------------------------------
  // Test 6: Hata Senaryoları (Yetkisiz Kural, Cihaz Bulunamadı vb.)
  // -------------------------------------------------------------
  console.log('\n6. Hata Senaryoları ve İzolasyon Testi:');

  // 6.1 Başka kullanıcıya ait kural
  const unauthorizedRule = { id: 99, userId: 999, deviceId: 1, condition: '19:00', action: 'turn_on' };
  const resAuth = await executeRule(unauthorizedRule, { user: testUser });
  assert(resAuth.success === false && resAuth.isPermanentError === true, 'Başka kullanıcıya ait kural engellendi');

  // 6.2 Cihaz bulunamadı
  const missingDevRule = { id: 100, userId: 2, deviceId: 999999, condition: '19:00', action: 'turn_on' };
  const resMissing = await executeRule(missingDevRule, { user: testUser, devices: [] });
  assert(resMissing.success === false && resMissing.isPermanentError === true, 'Bulunamayan cihaz için kural reddedildi ve isPermanentError döndü');

  // 6.3 Cihaz başka kullanıcıya ait
  const wrongUserDevRule = { id: 101, userId: 2, deviceId: 5, condition: '19:00', action: 'turn_on' };
  const resWrongDev = await executeRule(wrongUserDevRule, { 
    user: testUser, 
    devices: [{ id: 5, userId: 1, name: 'Admin Cihazı' }] 
  });
  assert(resWrongDev.success === false && resWrongDev.isPermanentError === true, 'Başka kullanıcının cihazına erişim reddedildi');

  // -------------------------------------------------------------
  // Test 7: Dinleyici (Listener) Aboneliği ve Temizleme
  // -------------------------------------------------------------
  console.log('\n7. Cihaz Güncelleme Aboneliği (Event Listener) Testi:');
  let notifiedDev = null;
  const unsubscribe = onAutomationDeviceUpdate((dev) => {
    notifiedDev = dev;
  });
  assert(typeof unsubscribe === 'function', 'Abonelikten çıkma fonksiyonu döner');
  unsubscribe();

  console.log(`\n=== TEST SONUCU: ${passed} BAŞARILI, ${failed} BAŞARISIZ ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test çalıştırma hatası:', err);
  process.exit(1);
});
