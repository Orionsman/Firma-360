import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { t } from '@/lib/i18n';
import { typography } from '@/lib/typography';

export default function PrivacyPolicyScreen() {
  const isTr = t.locale() === 'tr';

  const sections = isTr
    ? [
        {
          title: 'Toplanan Veriler',
          body:
            'Hesap bilgileri, firma profili, müşteriler, tedarikçiler, ürünler, satışlar, ödemeler ve stok hareketleri gibi uygulamaya girdiğiniz iş verileri saklanır.',
        },
        {
          title: 'Verilerin Kullanımı',
          body:
            'Bu veriler hesabınızı yönetmek, firma kayıtlarını senkronize etmek, güvenliği sağlamak ve destek sunmak için kullanılır.',
        },
        {
          title: 'Veri Saklama',
          body:
            'Hesabınız aktif olduğu sürece veriler saklanır. Hesap silme işlemi başlatıldığında, yasal veya finansal saklama zorunluluğu bulunmayan veriler silinir veya anonimleştirilir.',
        },
        {
          title: 'Veri Paylaşımı',
          body:
            'Veriler satılmaz. Yalnızca uygulamayı çalıştırmak için gerekli altyapı ve servis sağlayıcılarla paylaşılır.',
        },
        {
          title: 'Kullanıcı Hakları',
          body:
            'Kullanıcılar firma bilgilerini uygulama içinde güncelleyebilir ve hesaplarını uygulama içinden silebilir.',
        },
      ]
    : [
        {
          title: 'Collected Data',
          body:
            'Business data you enter into the app such as account details, company profile, customers, suppliers, products, sales, payments, and stock movements may be stored.',
        },
        {
          title: 'How Data Is Used',
          body:
            'This data is used to manage your account, synchronize company records, maintain security, and provide support.',
        },
        {
          title: 'Data Retention',
          body:
            'Data is retained while your account remains active. When account deletion is initiated, data that is not subject to legal or financial retention obligations is deleted or anonymized.',
        },
        {
          title: 'Data Sharing',
          body:
            'Data is not sold. It is only shared with infrastructure and service providers required to operate the app.',
        },
        {
          title: 'User Rights',
          body:
            'Users can update company information in the app and delete their accounts from within the app.',
        },
      ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BrandHeroHeader
        kicker={isTr ? 'YASAL BİLGİLENDİRME' : 'LEGAL INFORMATION'}
        title={isTr ? 'Gizlilik Politikası' : 'Privacy Policy'}
        subtitle={isTr ? 'Son güncelleme: 1 Nisan 2026' : 'Last updated: April 1, 2026'}
      />

      {sections.map((section) => (
        <View key={section.title} style={styles.card}>
          <Text style={styles.cardTitle}>{section.title}</Text>
          <Text style={styles.cardBody}>{section.body}</Text>
        </View>
      ))}

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>{isTr ? 'Store Hazırlığı' : 'Store Readiness'}</Text>
        <Text style={styles.noteText}>
          {isTr
            ? 'Bu sayfa, Expo web çıktısı olarak da yayınlanıp App Store ve Google Play gizlilik politikası bağlantısı olarak kullanılabilir.'
            : 'This page can also be published as an Expo web output and used as the privacy policy link for the App Store and Google Play.'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    paddingTop: 56,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  cardTitle: {
    ...typography.heading,
    fontSize: 18,
    color: '#0f172a',
    marginBottom: 8,
  },
  cardBody: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },
  noteCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginTop: 6,
  },
  noteTitle: {
    ...typography.heading,
    fontSize: 17,
    color: '#1d4ed8',
    marginBottom: 8,
  },
  noteText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 22,
    color: '#1e3a8a',
  },
});
