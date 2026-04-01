import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { typography } from '@/lib/typography';

const steps = [
  'Uygulamada oturum acin.',
  'Ayarlar ekranina gidin.',
  'Hesabi Kalici Olarak Sil bolumunu acin.',
  'Isterseniz bir neden girin.',
  'Silme islemini onaylayin.',
];

export default function AccountDeletionScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BrandHeroHeader
        kicker="YASAL BILGILENDIRME"
        title="Hesap Silme"
        subtitle="Son guncelleme: 1 Nisan 2026"
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hesap Silme Nasil Baslatilir?</Text>
        {steps.map((step) => (
          <Text key={step} style={styles.stepText}>
            - {step}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Silme Sonrasi</Text>
        <Text style={styles.cardBody}>
          Silme islemi tamamlandiginda kullanici oturumu kapatilir. Yasal olarak saklanmasi
          gereken kayitlar disindaki hesap ve uygulama verileri silinir veya anonimlestirilir.
        </Text>
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Store Hazirligi</Text>
        <Text style={styles.noteText}>
          Bu sayfa Expo web ciktisi olarak yayinlanip Google Play ve App Store hesap silme
          politikalari icin acik URL olarak kullanilabilir.
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
