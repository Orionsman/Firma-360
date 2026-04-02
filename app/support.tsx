import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { typography } from '@/lib/typography';

const contactItems = [
  {
    title: 'Uygulama Icindeki Kanallar',
    body:
      'Hesap bilgilerinizi, sifrenizi ve hesap silme taleplerinizi uygulama icindeki Ayarlar ekranindan yonetebilirsiniz.',
  },
  {
    title: 'Destek Talepleri',
    body:
      'Kullanici basvurulari, veri talepleri ve magaza inceleme sureclerinde kullanilmak uzere aktif bir destek e-postasi ve destek URLsi tanimlamaniz onerilir.',
  },
  {
    title: 'Yanit Sureci',
    body:
      'Veri talebi, teknik hata veya hesap sorunu gibi destek kayitlari makul surede kayda alinmali ve sonuc kullaniciya yazili olarak donulmelidir.',
  },
];

export default function SupportScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BrandHeroHeader
        kicker="DESTEK"
        title="Destek Bilgileri"
        subtitle="Son guncelleme: 1 Nisan 2026"
      />

      {contactItems.map((section) => (
        <View key={section.title} style={styles.card}>
          <Text style={styles.cardTitle}>{section.title}</Text>
          <Text style={styles.cardBody}>{section.body}</Text>
        </View>
      ))}

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Onemli Not</Text>
        <Text style={styles.noteText}>
          Magazaya cikmadan once gecerli bir destek e-postasi ve destek web sayfasi
          belirlemeniz gerekir. Bu bilgi App Store Connect ve Google Play Console icinde
          manuel olarak girilir.
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
