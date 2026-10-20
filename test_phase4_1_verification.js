import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5000';

async function runTests() {
  console.log('=== AURAHOME - PHASE 4.1 VERIFICATION TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. MUTFAK WEBP DOSYASI İKİLİ (BINARY) FORMAT VE İMZA DOĞRULAMASI
  console.log('1. Mutfak WebP Görsel Dosyası Doğrulaması:');
  const webpPath = path.resolve('public/rooms/mutfak.webp');
  assert(fs.existsSync(webpPath), 'public/rooms/mutfak.webp dosyası mevcut');

  const webpBuffer = fs.readFileSync(webpPath);
  const riffHeader = webpBuffer.toString('ascii', 0, 4);
  const webpTag = webpBuffer.toString('ascii', 8, 12);
  const isGenuineWebP = riffHeader === 'RIFF' && webpTag === 'WEBP';
  assert(isGenuineWebP, `Gerçek WebP formatı doğrulandı (RIFF: ${riffHeader}, TAG: ${webpTag})`);
  assert(webpBuffer.length > 50000, `Dosya boyutu geçerli görsel boyutunda (${webpBuffer.length} bayt)`);

  // Yedek dosya kontrolü
  const backupPath = path.resolve('public/rooms/mutfak_backup.webp');
  assert(fs.existsSync(backupPath), 'Orijinal görsel mutfak_backup.webp olarak yedeklenmiş');

  // Diğer odaların görsellerinin bozulmadığını kontrol et
  const otherRooms = ['salon.webp', 'yatak-odasi.webp', 'banyo.webp'];
  for (const roomFile of otherRooms) {
    const p = path.resolve('public/rooms', roomFile);
    assert(fs.existsSync(p), `${roomFile} mevcut ve korundu`);
  }

  // 2. DB.JSON MODEL VE KULLANICI KAPSAMI DOĞRULAMASI
  console.log('\n2. Veritabanı ve Kullanıcı Kapsamı Doğrulaması (db.json):');
  const dbRaw = fs.readFileSync(path.resolve('db.json'), 'utf-8');
  const dbData = JSON.parse(dbRaw);

  const ahmetUser = dbData.users.find(u => u.username === 'ahmet' && u.id === 2);
  assert(Boolean(ahmetUser), 'Ahmet kullanıcısı userId: 2 olarak doğrulandı');

  const wmInDb = dbData.devices.find(d => d.type === 'washing_machine');
  assert(Boolean(wmInDb), 'Çamaşır makinesi (washing_machine) db.json içinde mevcut');
  assert(wmInDb?.userId === 2, `Çamaşır makinesi userId: ${wmInDb?.userId} (Ahmet) ile eşleşiyor`);
  assert(wmInDb?.room === 'Mutfak', `Çamaşır makinesi odası "${wmInDb?.room}"`);

  const rvInDb = dbData.devices.find(d => d.type === 'robot_vacuum');
  assert(Boolean(rvInDb), 'Robot süpürge (robot_vacuum) db.json içinde mevcut');
  assert(rvInDb?.userId === 2, `Robot süpürge userId: ${rvInDb?.userId} (Ahmet) ile eşleşiyor`);
  assert(rvInDb?.room === 'Mutfak', `Robot süpürge odası "${rvInDb?.room}"`);

  // 3. REST API CANLI KONTROLLERİ (json-server)
  console.log('\n3. Canlı REST API Cihaz Kontrolleri ve Veri Akışı:');
  try {
    // Ahmet'in mutfak cihazlarını çek
    const resDevs = await fetch(`${API_BASE}/devices?userId=2&room=Mutfak`);
    const kitchenDevs = await resDevs.json();
    assert(resDevs.ok, 'Mutfak cihazları REST API üzerinden çekildi');
    assert(kitchenDevs.some(d => d.type === 'washing_machine'), 'Mutfak listesinde çamaşır makinesi var');
    assert(kitchenDevs.some(d => d.type === 'robot_vacuum'), 'Mutfak listesinde robot süpürge var');

    const wm = kitchenDevs.find(d => d.type === 'washing_machine');
    const rv = kitchenDevs.find(d => d.type === 'robot_vacuum');

    // 4. ÇAMAŞIR MAKİNESİ KONTROLLERİ TESTİ
    console.log('\n4. Çamaşır Makinesi Kontrolleri (Program Değişimi, Başlat, Duraklat, Sıfırla):');
    // Program seçimi: 'Hızlı'
    const patchProg = await fetch(`${API_BASE}/devices/${wm.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ program: 'Hızlı' })
    });
    const updatedProg = await patchProg.json();
    assert(updatedProg.program === 'Hızlı', 'Program "Hızlı" olarak güncellendi ve veritabanına yazıldı');

    // Program başlatma
    const patchStart = await fetch(`${API_BASE}/devices/${wm.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: true, programState: 'running' })
    });
    const updatedStart = await patchStart.json();
    assert(updatedStart.status === true && updatedStart.programState === 'running', 'Çamaşır makinesi başlatıldı (status: true, programState: "running")');

    // Program duraklatma
    const patchPause = await fetch(`${API_BASE}/devices/${wm.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: false, programState: 'paused' })
    });
    const updatedPause = await patchPause.json();
    assert(updatedPause.status === false && updatedPause.programState === 'paused', 'Çamaşır makinesi duraklatıldı (status: false, programState: "paused")');

    // Hazır duruma alma (Reset)
    const patchReset = await fetch(`${API_BASE}/devices/${wm.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: false, programState: 'ready', program: 'Eco' })
    });
    const updatedReset = await patchReset.json();
    assert(updatedReset.programState === 'ready' && updatedReset.program === 'Eco', 'Çamaşır makinesi hazır duruma alındı (Eco, ready)');

    // 5. ROBOT SÜPÜRGE KONTROLLERİ TESTİ
    console.log('\n5. Robot Süpürge Kontrolleri (Temizliği Başlat, Duraklat, Şarja Dön):');
    // Temizliği başlat
    const patchRvStart = await fetch(`${API_BASE}/devices/${rv.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: true, mode: 'cleaning' })
    });
    const updatedRvStart = await patchRvStart.json();
    assert(updatedRvStart.status === true && updatedRvStart.mode === 'cleaning', 'Robot süpürge temizliği başlattı (mode: "cleaning")');

    // Temizliği duraklat
    const patchRvPause = await fetch(`${API_BASE}/devices/${rv.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: false, mode: 'paused' })
    });
    const updatedRvPause = await patchRvPause.json();
    assert(updatedRvPause.status === false && updatedRvPause.mode === 'paused', 'Robot süpürge duraklatıldı (mode: "paused")');

    // Şarj istasyonuna döndür
    const patchRvDock = await fetch(`${API_BASE}/devices/${rv.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: false, mode: 'docked' })
    });
    const updatedRvDock = await patchRvDock.json();
    assert(updatedRvDock.mode === 'docked' && updatedRvDock.status === false, 'Robot süpürge şarj istasyonuna döndü (mode: "docked")');

    // 6. BİLDİRİM VE AUDIT LOG KAYDI TESTİ
    console.log('\n6. Bildirim API Entegrasyonu:');
    const notifRes = await fetch(`${API_BASE}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 2,
        message: 'Mutfak Donanımı: Akıllı Çamaşır Makinesi - Eco programı hazır',
        timestamp: new Date().toISOString()
      })
    });
    const createdNotif = await notifRes.json();
    assert(notifRes.ok && Boolean(createdNotif.id), 'Bildirim API üzerinden başarıyla kaydedildi');

    // 7. ODA VE DİĞER KULLANICI İZOLASYONU TESTİ
    console.log('\n7. Oda İzolasyonu ve Diğer Kullanıcıların Korunması:');
    const salonDevsRes = await fetch(`${API_BASE}/devices?userId=2&room=Salon`);
    const salonDevs = await salonDevsRes.json();
    const salonHasAppliances = salonDevs.some(d => d.type === 'washing_machine' || d.type === 'robot_vacuum');
    assert(!salonHasAppliances, 'Salon odasında mutfak aletleri bulunmuyor (Oda İzolasyonu Korundu)');

    const adminDevsRes = await fetch(`${API_BASE}/devices?userId=1`);
    const adminDevs = await adminDevsRes.json();
    const adminHasAppliances = adminDevs.some(d => d.type === 'washing_machine' || d.type === 'robot_vacuum');
    assert(!adminHasAppliances, 'Admin (userId: 1) cihaz listesi etkilenmedi (Kullanıcı İzolasyonu Korundu)');

  } catch (err) {
    console.error('API Test Hatası:', err);
    failed++;
  }

  console.log(`\n=== TEST SONUCU: ${passed} GEÇTİ, ${failed} BAŞARISIZ ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
