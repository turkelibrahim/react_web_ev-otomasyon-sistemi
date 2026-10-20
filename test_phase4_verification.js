/**
 * Phase 4 Verification Suite for AuraHome: Photo-First Dashboard Redesign
 */

import { getRoomImagePath } from './src/utils/roomVisuals.js';
import { devicesApi, notificationsApi, usersApi } from './src/services/api.js';
import fs from 'fs';

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
  console.log('\n=== AURAHOME PHASE 4: PHOTO-FIRST DASHBOARD VERIFICATION TESTS ===\n');

  // -------------------------------------------------------------
  // Test 1: Eski Kat Planı Kaldırılma Kontrolü
  // -------------------------------------------------------------
  console.log('1. Dashboard Kaynak Kodunda Kat Planı Kaldırılma Kontrolü:');
  const dashboardSource = fs.readFileSync('./src/pages/DashboardPage.jsx', 'utf8');

  assert(!dashboardSource.includes('<FloorPlanView'), 'FloorPlanView bileşeni DashboardPage JSX içerisinden kaldırıldı');
  assert(!dashboardSource.includes('import FloorPlanView'), 'FloorPlanView import satırı DashboardPage içerisinden kaldırıldı');
  assert(dashboardSource.includes('visual-control-center-section'), 'Yeni "visual-control-center-section" alanı eklendi');
  assert(dashboardSource.includes('Evim — Görsel Kontrol Merkezi'), 'Bölüm başlığı "Evim — Görsel Kontrol Merkezi" mevcut');
  assert(dashboardSource.includes('room-cards-selector-container'), 'Fotoğraflı oda seçici konteyneri mevcut');

  // Kat planı dosyalarının silinmediğini doğrula
  assert(fs.existsSync('./src/components/FloorPlanView.jsx'), 'FloorPlanView.jsx dosyası projede güvenle korundu');
  assert(fs.existsSync('./src/components/FloorPlan.jsx'), 'FloorPlan.jsx dosyası projede güvenle korundu');

  // -------------------------------------------------------------
  // Test 2: Görsel Eşleme (Room Image Resolution) Kontrolü
  // -------------------------------------------------------------
  console.log('\n2. Oda Görselleri ve Fallback Eşleme Testi:');
  assert(getRoomImagePath('Salon') === '/rooms/salon.webp', 'Salon -> /rooms/salon.webp');
  assert(getRoomImagePath('Mutfak') === '/rooms/mutfak.webp', 'Mutfak -> /rooms/mutfak.webp');
  assert(getRoomImagePath('Yatak Odası') === '/rooms/yatak-odasi.webp', 'Yatak Odası -> /rooms/yatak-odasi.webp');
  assert(getRoomImagePath('Banyo') === '/rooms/banyo.webp', 'Banyo -> /rooms/banyo.webp');
  assert(getRoomImagePath('Balkon') === null, 'Balkon -> null (Fallback mekanizmasına aktarılır)');
  assert(getRoomImagePath('Garaj') === null, 'Garaj -> null (Fallback mekanizmasına aktarılır)');
  assert(getRoomImagePath('Çalışma Odası') === null, 'Çalışma Odası -> null (Fallback mekanizmasına aktarılır)');

  // -------------------------------------------------------------
  // Test 3: Oda İzolasyonu ve Işık Durumu Türetimi
  // -------------------------------------------------------------
  console.log('\n3. Oda Işık İzolasyonu Testi:');
  const testDevices = [
    { id: 1, name: 'Salon Işığı', room: 'Salon', type: 'light', status: true },
    { id: 2, name: 'Salon Klima', room: 'Salon', type: 'thermostat', status: true },
    { id: 3, name: 'Mutfak Işığı', room: 'Mutfak', type: 'light', status: false },
    { id: 4, name: 'Mutfak Priz', room: 'Mutfak', type: 'socket', status: true }
  ];

  const isSameRoom = (a, b) => a.toLowerCase().trim() === b.toLowerCase().trim();

  // Salon odası kontrolü
  const salonDevs = testDevices.filter(d => isSameRoom(d.room, 'Salon'));
  const isSalonLightOn = salonDevs.some(d => d.type === 'light' && d.status === true);
  assert(isSalonLightOn === true, 'Salon ışığı açık olarak tespit edildi (Sıcak ambiyans aktif)');

  // Mutfak odası kontrolü (Salon ışığının Mutfak'ı etkilemediğini doğrula)
  const mutfakDevs = testDevices.filter(d => isSameRoom(d.room, 'Mutfak'));
  const isMutfakLightOn = mutfakDevs.some(d => d.type === 'light' && d.status === true);
  assert(isMutfakLightOn === false, 'Salon ışığı açıkken Mutfak ışığı KAPALI kaldı (Tam oda izolasyonu)');

  // -------------------------------------------------------------
  // Test 4: API ve Cihaz CRUD Entegrasyonu Kontrolü
  // -------------------------------------------------------------
  console.log('\n4. Gerçek REST API CRUD & Durum Kaydı Testi:');
  try {
    // 1. Ahmet kullanıcısının cihazlarını al
    const ahmetDevices = await devicesApi.getByUser(2);
    assert(Array.isArray(ahmetDevices) && ahmetDevices.length > 0, `Kullanıcı #2 cihazları çekildi (${ahmetDevices.length} cihaz)`);

    // 2. Bir cihazın durumunu güncelle (Salon Işığı - id: 1)
    const targetDev = ahmetDevices.find(d => d.id === 1) || ahmetDevices[0];
    const originalStatus = targetDev.status;
    const toggledStatus = !originalStatus;

    const updated = await devicesApi.update(targetDev.id, { status: toggledStatus });
    assert(updated.status === toggledStatus, `Cihaz PATCH işlemi başarılı: ${targetDev.name} status -> ${toggledStatus}`);

    // Tekrar eski haline getir
    const restored = await devicesApi.update(targetDev.id, { status: originalStatus });
    assert(restored.status === originalStatus, `Cihaz durumu başarıyla eski haline geri alındı: ${targetDev.name} status -> ${originalStatus}`);

    // Bildirim kaydını doğrula
    const notif = await notificationsApi.create({
      userId: 2,
      message: `Phase 4 Test: ${targetDev.name} durumu test edildi.`,
      timestamp: new Date().toISOString()
    });
    assert(notif && notif.id, `Bildirim kaydı başarıyla oluşturuldu (#${notif.id})`);
  } catch (err) {
    console.error('API testi hatası:', err);
    failed++;
  }

  console.log(`\n=== PHASE 4 TEST SONUCU: ${passed} BAŞARILI, ${failed} BAŞARISIZ ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test süiti hatası:', err);
  process.exit(1);
});
