import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { typography } from '@/lib/typography';

const sections = [
  {
    title: 'Toplanan Veriler',
    body:
      'Hesap bilgileri, firma profili, müşteriler, tedarikçiler, ürünler, satışlar, ödemeler ve stok hareketleri gibi uygulamaya girdiğiniz iş verileri saklanır.',
  },
  {
    title: 'Verilerin Kullanimi',
    body:
      'Bu veriler hesabınızı yönetmek, firma kayıtlarını senkronize etmek, güvenliği sağlamak ve destek sunmak için kullanılır.',
  },
  {
    title: 'Veri Saklama',
    body:
      'Hesabınız aktif olduğu sürece veriler saklanır. Hesap silme talebi oluşturulduğunda, yasal veya finansal saklama zorunluluğu bulunmayan veriler silinir veya anonimleştirilir.',
  },
  {
    title: 'Veri Paylasimi',
    body:
      'Veriler satılmaz. Yalnızca uygulamayı çalıştırmak için gerekli altyapı ve servis sağlayıcılarla paylaşılır.',
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BrandHeroHeader
        kicker="YASAL BİLGİLENDİRME"
        title="Gizlilik Politikası"
        subtitle="Son güncelleme: 27 Mart 2026"
      />

      {sections.map((section) => (
        <View key={section.title} style={styles.card}>
          <Text style={styles.cardTitle}>{section.title}</Text>
          <Text style={styles.cardBody}>{section.body}</Text>
        </View>
      ))}

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Yayın Notu</Text>
        <Text style={styles.noteText}>
          Store gönderimi öncesinde bu içeriğin genel erişime açık bir HTTPS sayfasında
          yayınlanması gerekir. Kaynak metin `docs/privacy-policy.md` dosyasında bulunur.
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
