import { ScrollView, StyleSheet, Text, View } from 'react-native';

const steps = [
  'Ayarlar ekranindaki Hesap Silme bolumunden silme talebi baslatilir.',
  'Talep onaylandiginda sistemde bir silme kaydi olusturulur.',
  'Talep backend tarafinda islenir; uygun veriler silinir veya anonimlestirilir.',
  'Yasal olarak saklanmasi gereken kayitlar varsa bunlar ayrica ele alinabilir.',
];

export default function AccountDeletionScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Hesap Silme</Text>
        <Text style={styles.subtitle}>Son guncelleme: 27 Mart 2026</Text>
      </View>

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
          Silme islemi tamamlandiginda hesaba yeniden erismek icin yeni bir hesap
          olusturmaniz gerekebilir. Saklama zorunlulugu olan kayitlar mevzuata gore
          korunabilir.
        </Text>
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Play Store Notu</Text>
        <Text style={styles.noteText}>
          Google Play icin bu akisin genel erisime acik bir web sayfasi olarak da
          yayinlanmasi gerekir. Kaynak metin docs/account-deletion.md dosyasinda bulunur.
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
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  subtitle: {
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
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },
  stepText: {
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
    fontSize: 17,
    fontWeight: '700',
    color: '#1d4ed8',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#1e3a8a',
  },
});
