export const trSettings = {
  title: 'Ayarlar',
  kicker: 'HESAP VE GORUNUM',
  subtitle: 'Hesabini, firma bilgilerini ve uygulama tercihlerini tek yerden yonet.',
  switchToLight: 'Acik moda gec',
  switchToDark: 'Koyu moda gec',
  language: 'Dil',
  languageDescription: 'Uygulama dilini secin.',
  companyInfo: 'Firma Bilgileri',
  companyNotFound: 'Duzenlenecek firma bulunamadi.',
  companyNameRequired: 'Firma adi bos olamaz.',
  companyUpdated: 'Firma bilgileri basariyla guncellendi.',
  companySaveFailed: 'Firma bilgileri kaydedilemedi.',
  showCompanyEditor: 'Firma Bilgilerini Duzenle',
  hideCompanyEditor: 'Firma Bilgilerini Gizle',
  fields: {
    taxNumber: 'Vergi No',
    deletionReason: 'Silme Nedeni (Opsiyonel)',
  },
  password: {
    title: 'Sifre Degistir',
    placeholder: 'En az 6 karakter',
    tooShort: 'Yeni sifre en az 6 karakter olmali.',
    updated: 'Sifreniz guncellendi.',
    updateFailed: 'Sifre degistirilemedi.',
    action: 'Sifreyi Guncelle',
    updating: 'Guncelleniyor...',
  },
  about: {
    title: 'Hakkimizda',
    text:
      'CepteCari ile borc ve alacak takibini kolayca yonetin. Esnaflar ve kucuk isletmeler icin gelistirilen bu yapi sayesinde tum kayitlariniz her an elinizin altinda olur.',
    privacy: 'Gizlilik Politikasini Ac',
    deletionInfo: 'Hesap Silme Detaylarini Ac',
  },
  deletion: {
    title: 'Hesabi Kalici Olarak Sil',
    text:
      'Buradan hesabinizi ve hesabiniza bagli verileri kalici olarak silebilirsiniz. Yasal saklama zorunlulugu olan kayitlar haricindeki veriler silinir veya anonimlestirilir.',
    placeholder: 'Silme islemiyle ilgili kisa bir not yazabilirsiniz.',
    inlineInfo:
      'Islem tamamlandiginda oturumunuz kapatilir ve hesabiniza yeniden erismek icin yeni kayit olusturmaniz gerekir.',
    action: 'Hesabi Kalici Olarak Sil',
    requesting: 'Hesap Siliniyor...',
    confirmTitle: 'Hesap kalici olarak silinsin mi?',
    confirmText:
      'Bu islem geri alinamaz. Hesabiniz ve ona bagli verileriniz silinir veya anonimlestirilir.',
    confirmAction: 'Hesabi Sil',
    receivedTitle: 'Hesap Silindi',
    receivedText:
      'Hesabiniz basariyla silindi. Guvenlik nedeniyle cikis yapildi.',
    failed: 'Hesap silinemedi.',
  },
  logout: 'Cikis Yap',
  logoutFailed: 'Cikis yapilamadi.',
} as const;
