export const trSettings = {
  title: 'Ayarlar',
  kicker: 'HESAP VE GÖRÜNÜM',
  subtitle: 'Hesabını, firma bilgilerini ve uygulama tercihlerini tek yerden yönet.',
  switchToLight: 'Açık moda geç',
  switchToDark: 'Koyu moda geç',
  language: 'Dil',
  languageTitle: 'Dil Ayarları',
  languageDescription: 'Uygulama dilini seçin.',
  activeLanguage: 'Aktif dil',
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
    title: 'Yasal ve Destek',
    text:
      'Gizlilik, hesap silme, kullanım koşulları, KVKK aydınlatma metni ve destek kanallarına bu bölümden ulaşabilirsiniz.',
    privacy: 'Gizlilik Politikasını Aç',
    deletionInfo: 'Hesap Silme Detaylarını Aç',
    terms: 'Kullanım Koşullarını Aç',
    kvkk: 'KVKK Aydınlatma Metnini Aç',
    support: 'Destek Bilgilerini Aç',
  },
  proTools: {
    title: 'Pro Araçları',
    text:
      'Çoklu işletme, ekip erişimi, bulut yedekleme ve tahsilat hatırlatmalarını yönetin.',
    action: 'İşletme Araçlarını Aç',
  },
  deletion: {
    title: 'Hesabı Kalıcı Olarak Sil',
    text:
      'Buradan hesabınızı ve hesabınıza bağlı verileri kalıcı olarak silebilirsiniz. Yasal saklama zorunluluğu olan kayıtlar hariç veriler silinir veya anonimleştirilir.',
    placeholder: 'Silme işlemiyle ilgili kısa bir not yazabilirsiniz.',
    inlineInfo:
      'İşlem tamamlandığında oturumunuz kapatılır ve hesabınıza yeniden erişmek için yeni kayıt oluşturmanız gerekir.',
    action: 'Hesabı Kalıcı Olarak Sil',
    requesting: 'Hesap Siliniyor...',
    confirmTitle: 'Hesap kalıcı olarak silinsin mi?',
    confirmText:
      'Bu işlem geri alınamaz. Hesabınız ve ona bağlı verileriniz silinir veya anonimleştirilir.',
    confirmAction: 'Hesabı Sil',
    receivedTitle: 'Hesap Silindi',
    receivedText:
      'Hesabınız başarıyla silindi. Güvenlik nedeniyle çıkış yapıldı.',
    failed: 'Hesap silinemedi.',
  },
  logout: 'Çıkış Yap',
  logoutFailed: 'Çıkış yapılamadı.',
} as const;
