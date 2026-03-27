import { ScrollView, StyleSheet, Text, View } from 'react-native';

const sections = [
  {
    title: 'Toplanan Veriler',
    body:
      'Hesap bilgileri, firma profili, musteriler, tedarikciler, urunler, satislar, odemeler ve stok hareketleri gibi uygulamaya girdiginiz is verileri saklanir.',
  },
  {
    title: 'Verilerin Kullanimi',
    body:
      'Bu veriler hesabinizi yonetmek, firma kayitlarini senkronize etmek, guvenligi saglamak ve destek sunmak icin kullanilir.',
  },
  {
    title: 'Veri Saklama',
    body:
      'Hesabiniz aktif oldugu surece veriler saklanir. Hesap silme talebi olusturuldugunda, yasal veya finansal saklama zorunlulugu bulunmayan veriler silinir veya anonimlestirilir.',
  },
  {
    title: 'Veri Paylasimi',
    body:
      'Veriler satilmaz. Yalnizca uygulamayi calistirmak icin gerekli altyapi ve servis saglayicilarla paylasilir.',
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Gizlilik Politikasi</Text>
        <Text style={styles.subtitle}>Son guncelleme: 27 Mart 2026</Text>
      </View>

      {sections.map((section) => (
        <View key={section.title} style={styles.card}>
          <Text style={styles.cardTitle}>{section.title}</Text>
          <Text style={styles.cardBody}>{section.body}</Text>
        </View>
      ))}

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Yayin Notu</Text>
        <Text style={styles.noteText}>
          Store gonderimi oncesinde bu icerigin genel erisime acik bir HTTPS sayfasinda
          yayinlanmasi gerekir. Kaynak metin docs/privacy-policy.md dosyasinda bulunur.
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
    marginBottom: 8,
  },
  cardBody: {
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
