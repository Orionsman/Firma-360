export const trSettings = {
  title: 'Ayarlar',
  kicker: 'HESAP VE GÖRÜNÜM',
  subtitle: 'Hesabını, firma bilgilerini ve uygulama tercihlerini tek yerden yönet.',
  switchToLight: 'Açık moda geç',
  switchToDark: 'Koyu moda geç',
  language: 'Dil',
  languageDescription: 'Uygulama dilini seçin.',
  companyInfo: 'Firma Bilgileri',
  companyNotFound: 'Düzenlenecek firma bulunamadı.',
  companyNameRequired: 'Firma adı boş olamaz.',
  companyUpdated: 'Firma bilgileri başarıyla güncellendi.',
  companySaveFailed: 'Firma bilgileri kaydedilemedi.',
  showCompanyEditor: 'Firma Bilgilerini Düzenle',
  hideCompanyEditor: 'Firma Bilgilerini Gizle',
  fields: {
    taxNumber: 'Vergi No',
    deletionReason: 'Silme Nedeni (Opsiyonel)',
  },
  password: {
    title: 'Şifre Değiştir',
    placeholder: 'En az 6 karakter',
    tooShort: 'Yeni şifre en az 6 karakter olmalı.',
    updated: 'Şifreniz güncellendi.',
    updateFailed: 'Şifre değiştirilemedi.',
    action: 'Şifreyi Güncelle',
    updating: 'Güncelleniyor...',
  },
  about: {
    title: 'Hakkımızda',
    text:
      'CepteCari ile borç ve alacak takibini kolayca yönetin. Esnaflar ve bireysel kullanıcılar için geliştirilen bu pratik yapı sayesinde tüm hesaplarınız her an elinizin altında.',
    privacy: 'Gizlilik Politikasını Aç',
    deletionInfo: 'Hesap Silme Detaylarını Aç',
  },
  deletion: {
    title: 'Hesap Silme',
    text:
      'Buradan hesap silme talebi oluşturabilirsiniz. Talep kaydedildikten sonra arka planda işlenir ve geri alınamayabilir.',
    placeholder: 'Talebinizle ilgili kısa bir not yazabilirsiniz.',
    inlineInfo:
      'İşlem tamamlandığında size ait hesap verileri silinir veya anonimleştirilir.',
    action: 'Silme Talebi Gönder',
    requesting: 'Talep Gönderiliyor...',
    confirmTitle: 'Hesap silme talebi gönderilsin mi?',
    confirmText:
      'Bu işlem silme talebinizi kaydeder. Talep arka planda işlenir; yasal saklama zorunluluğu olmayan veriler silinir veya anonimleştirilir.',
    confirmAction: 'Talep Gönder',
    receivedTitle: 'Talep Alındı',
    receivedText:
      'Hesap silme talebiniz kaydedildi. İşlem arka planda tamamlanacaktır.',
    failed: 'Hesap silinemedi.',
  },
  logout: 'Çıkış Yap',
  logoutFailed: 'Çıkış yapılamadı.',
} as const;
