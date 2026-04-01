import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { typography } from '@/lib/typography';

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
      'Hesabiniz aktif oldugu surece veriler saklanir. Hesap silme islemi baslatildiginda, yasal veya finansal saklama zorunlulugu bulunmayan veriler silinir veya anonimlestirilir.',
  },
  {
    title: 'Veri Paylasimi',
    body:
      'Veriler satilmaz. Yalnizca uygulamayi calistirmak icin gerekli altyapi ve servis saglayicilarla paylasilir.',
  },
  {
    title: 'Kullanici Haklari',
    body:
      'Kullanicilar firma bilgilerini uygulama icinde guncelleyebilir ve hesaplarini uygulama icinden silebilir.',
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BrandHeroHeader
        kicker="YASAL BILGILENDIRME"
        title="Gizlilik Politikasi"
        subtitle="Son guncelleme: 1 Nisan 2026"
      />

      {sections.map((section) => (
        <View key={section.title} style={styles.card}>
          <Text style={styles.cardTitle}>{section.title}</Text>
          <Text style={styles.cardBody}>{section.body}</Text>
        </View>
      ))}

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Store Hazirligi</Text>
        <Text style={styles.noteText}>
          Bu sayfa, Expo web ciktisi olarak da yayinlanip App Store ve Google Play gizlilik politikasi
          baglantisi olarak kullanilabilir.
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
