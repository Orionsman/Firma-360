import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { t } from '@/lib/i18n';
import { typography } from '@/lib/typography';

export default function TermsOfServiceScreen() {
  const isTr = t.locale() === 'tr';

  const sections = isTr
    ? [
        {
          title: 'Hizmet Kapsamı',
          body:
            'CepteCari, küçük işletmelerin cari, stok, satış, ödeme ve tahsilat kayıtlarını dijital olarak yönetmesine yardımcı olan bir iş uygulamasıdır.',
        },
        {
          title: 'Hesap Kullanımı',
          body:
            'Kullanıcı, hesabının ve şifresinin güvenliğinden sorumludur. Uygulama hukuka aykırı, aldatıcı veya başka kişilerin haklarını ihlal eden amaçlarla kullanılamaz.',
        },
        {
          title: 'Veri Sorumluluğu',
          body:
            'Kullanıcı, uygulamaya girdiği ticari kayıtların doğruluğundan sorumludur. CepteCari, kullanıcının girdiği verilerin içeriğinden doğan ticari veya hukuki sonuçlardan sorumlu değildir.',
        },
        {
          title: 'Hizmette Değişiklik',
          body:
            'Uygulama özellikleri zaman içinde güncellenebilir, geliştirilebilir veya kaldırılabilir. Önemli değişiklikler makul ölçüde uygulama veya yayın kanalları üzerinden duyurulur.',
        },
        {
          title: 'Fesih ve Silme',
          body:
            'Kullanıcı, hesabını uygulama içinden silebilir. Hizmetin kötüye kullanımı veya güvenlik riski oluşturan durumlarda hesap erişimi kısıtlanabilir.',
        },
      ]
    : [
        {
          title: 'Service Scope',
          body:
            'CepteCari is a business app that helps small businesses manage account balances, stock, sales, payments, and collection records digitally.',
        },
        {
          title: 'Account Use',
          body:
            'The user is responsible for the security of their account and password. The app may not be used for unlawful, deceptive, or rights-violating purposes.',
        },
        {
          title: 'Data Responsibility',
          body:
            'The user is responsible for the accuracy of the commercial records entered into the app. CepteCari is not responsible for commercial or legal consequences arising from user-entered content.',
        },
        {
          title: 'Service Changes',
          body:
            'App features may be updated, improved, or removed over time. Significant changes are announced through the app or publication channels when reasonably possible.',
        },
        {
          title: 'Termination and Deletion',
          body:
            'The user can delete their account from within the app. Account access may be restricted in cases of misuse or security risk.',
        },
      ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BrandHeroHeader
        kicker={isTr ? 'YASAL BİLGİLENDİRME' : 'LEGAL INFORMATION'}
        title={isTr ? 'Kullanım Koşulları' : 'Terms of Service'}
        subtitle={isTr ? 'Son güncelleme: 1 Nisan 2026' : 'Last updated: April 1, 2026'}
      />

      {sections.map((section) => (
        <View key={section.title} style={styles.card}>
          <Text style={styles.cardTitle}>{section.title}</Text>
          <Text style={styles.cardBody}>{section.body}</Text>
        </View>
      ))}
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
});
