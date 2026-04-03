import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { t } from '@/lib/i18n';
import { typography } from '@/lib/typography';

export default function AccountDeletionScreen() {
  const isTr = t.locale() === 'tr';

  const steps = isTr
    ? [
        'Uygulamada oturum açın.',
        'Ayarlar ekranına gidin.',
        'Hesabı Kalıcı Olarak Sil bölümünü açın.',
        'İsterseniz bir neden girin.',
        'Silme işlemini onaylayın.',
      ]
    : [
        'Sign in to the app.',
        'Go to the Settings screen.',
        'Open the Delete Account Permanently section.',
        'Optionally enter a reason.',
        'Confirm the deletion action.',
      ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BrandHeroHeader
        kicker={isTr ? 'YASAL BİLGİLENDİRME' : 'LEGAL INFORMATION'}
        title={isTr ? 'Hesap Silme' : 'Account Deletion'}
        subtitle={isTr ? 'Son güncelleme: 1 Nisan 2026' : 'Last updated: April 1, 2026'}
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {isTr ? 'Hesap Silme Nasıl Başlatılır?' : 'How to Start Account Deletion'}
        </Text>
        {steps.map((step) => (
          <Text key={step} style={styles.stepText}>
            - {step}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{isTr ? 'Silme Sonrası' : 'After Deletion'}</Text>
        <Text style={styles.cardBody}>
          {isTr
            ? 'Silme işlemi tamamlandığında kullanıcı oturumu kapatılır. Yasal olarak saklanması gereken kayıtlar dışındaki hesap ve uygulama verileri silinir veya anonimleştirilir.'
            : 'When the deletion process is completed, the user session is closed. Account and app data, except records that must be retained by law, is deleted or anonymized.'}
        </Text>
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>{isTr ? 'Store Hazırlığı' : 'Store Readiness'}</Text>
        <Text style={styles.noteText}>
          {isTr
            ? 'Bu sayfa Expo web çıktısı olarak yayınlanıp Google Play ve App Store hesap silme politikaları için açık URL olarak kullanılabilir.'
            : 'This page can be published as Expo web output and used as a public URL for Google Play and App Store account deletion policies.'}
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
    marginBottom: 10,
  },
  cardBody: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },
  stepText: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
    marginBottom: 8,
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
