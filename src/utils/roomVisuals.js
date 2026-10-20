/**
 * AuraHome - Oda Görsel Eşleme Yardımcısı
 * 
 * Verilen oda adına ve ışık durumuna göre yerel fotogerçekçi görsel yolunu döner.
 * Desteklenen odalar: Salon, Mutfak, Yatak Odası, Banyo.
 * Işık açıkken aydınlık / lambaları yanan fotoğraf; ışık kapalıyken lambaları sönmüş gerçekçi gece fotoğrafı döner.
 */
export const getRoomImagePath = (name, isLightOn = true, isGlassClosed = false) => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('mutfak')) {
    return isLightOn ? '/rooms/mutfak.webp' : '/rooms/mutfak-off.jpg';
  }
  if (lower.includes('yatak')) {
    return isLightOn ? '/rooms/yatak-odasi.webp' : '/rooms/yatak-odasi-off.jpg';
  }
  if (lower.includes('banyo')) {
    return isLightOn ? '/rooms/banyo.webp' : '/rooms/banyo-off.jpg';
  }
  if (lower.includes('salon') || lower.includes('oturma')) {
    return isLightOn ? '/rooms/salon.webp' : '/rooms/salon-off.jpg';
  }
  if (lower.includes('balkon') || lower.includes('teras')) {
    if (isGlassClosed) {
      return isLightOn ? '/rooms/balkon-closed.webp' : '/rooms/balkon-closed-off.jpg';
    }
    return isLightOn ? '/rooms/balkon.webp' : '/rooms/balkon-off.jpg';
  }
  return null;
};

export const getRoomImages = (name, isGlassClosed = false) => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('mutfak')) {
    return { on: '/rooms/mutfak.webp', off: '/rooms/mutfak-off.jpg' };
  }
  if (lower.includes('yatak')) {
    return { on: '/rooms/yatak-odasi.webp', off: '/rooms/yatak-odasi-off.jpg' };
  }
  if (lower.includes('banyo')) {
    return { on: '/rooms/banyo.webp', off: '/rooms/banyo-off.jpg' };
  }
  if (lower.includes('salon') || lower.includes('oturma')) {
    return { on: '/rooms/salon.webp', off: '/rooms/salon-off.jpg' };
  }
  if (lower.includes('balkon') || lower.includes('teras')) {
    if (isGlassClosed) {
      return { on: '/rooms/balkon-closed.webp', off: '/rooms/balkon-closed-off.jpg' };
    }
    return { on: '/rooms/balkon.webp', off: '/rooms/balkon-off.jpg' };
  }
  return null;
};

