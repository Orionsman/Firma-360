import { ScrollView, StyleSheet, Text, View } from 'react-native';

const steps = [
  'Ayarlar ekranindaki Hesap Silme bolumunden talep baslatilir.',
  'Talep guvenli sekilde kayda alinir ve acik bir silme talebi olarak isaretlenir.',
  'Talep sonrasinda kullanici uygulamadan cikis yaptirilir.',
  'Yasal olarak saklanmasi gerekmeyen veriler silinir veya anonimlestirilir.',
];

export default function AccountDeletionScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Hesap Silme</Text>
        <Text style={styles.subtitle}>Son guncelleme: 27 Mart 2026</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Silme Talebi Nasil Baslatilir?</Text>
        {steps.map((step) => (
          <Text key={step} style={styles.stepText}>
            - {step}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Veri Saklama Istisnalari</Text>
        <Text style={styles.cardBody}>
          Vergi, muhasebe, dolandiricilik onleme, guvenlik veya diger yasal
          zorunluluklar nedeniyle saklanmasi gereken kayitlar hemen silinmeyebilir.
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
