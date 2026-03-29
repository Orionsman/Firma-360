import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { typography } from '@/lib/typography';

const steps = [
  'Kullanıcı panelindeki Hesap bölümünden silme talebi başlatılır.',
  'Talep onaylandığında sistemde bir silme kaydı oluşturulur.',
  'Talep backend tarafında işlenir; uygun veriler silinir veya anonimleştirilir.',
  'Yasal olarak saklanması gereken kayıtlar varsa bunlar ayrıca ele alınabilir.',
];

export default function AccountDeletionScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BrandHeroHeader
        kicker="YASAL BİLGİLENDİRME"
        title="Hesap Silme"
        subtitle="Son güncelleme: 27 Mart 2026"
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hesap Silme Nasıl Başlatılır?</Text>
        {steps.map((step) => (
          <Text key={step} style={styles.stepText}>
            - {step}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Silme Sonrasi</Text>
        <Text style={styles.cardBody}>
          Silme işlemi tamamlandığında hesaba yeniden erişmek için yeni bir hesap
          oluşturmanız gerekebilir. Saklama zorunluluğu olan kayıtlar mevzuata göre
          korunabilir.
        </Text>
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Play Store Notu</Text>
        <Text style={styles.noteText}>
          Google Play için bu akışın genel erişime açık bir web sayfası olarak da
          yayınlanması gerekir. Kaynak metin `docs/account-deletion.md` dosyasında bulunur.
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
  header: {
    marginBottom: 20,
  },
  title: {
    ...typography.title,
    fontSize: 28,
    color: '#0f172a',
    marginBottom: 6,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 14,
    color: '#64748b',
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
