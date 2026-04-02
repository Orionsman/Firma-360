import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { typography } from '@/lib/typography';

const sections = [
  {
    title: 'Hizmet Kapsami',
    body:
      'CepteCari, kucuk isletmelerin cari, stok, satis, odeme ve tahsilat kayitlarini dijital olarak yonetmesine yardimci olan bir is uygulamasidir.',
  },
  {
    title: 'Hesap Kullanimi',
    body:
      'Kullanici, hesabinin ve sifresinin guvenliginden sorumludur. Uygulama hukuka aykiri, aldatici veya baska kisilerin haklarini ihlal eden amaclarla kullanilamaz.',
  },
  {
    title: 'Veri Sorumlulugu',
    body:
      'Kullanici, uygulamaya girdigi ticari kayitlarin dogrulugundan sorumludur. CepteCari, kullanicinin girdigi verilerin iceriginden dogan ticari veya hukuki sonuclardan sorumlu degildir.',
  },
  {
    title: 'Hizmette Degisiklik',
    body:
      'Uygulama ozellikleri zaman icinde guncellenebilir, gelistirilebilir veya kaldirilabilir. Onemli degisiklikler makul olcude uygulama veya yayin kanallari uzerinden duyurulur.',
  },
  {
    title: 'Fesih ve Silme',
    body:
      'Kullanici, hesabini uygulama icinden silebilir. Hizmetin kotuye kullanimi veya guvenlik riski olusturan durumlarda hesap erisimi kisitlanabilir.',
  },
];

export default function TermsOfServiceScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BrandHeroHeader
        kicker="YASAL BILGILENDIRME"
        title="Kullanim Kosullari"
        subtitle="Son guncelleme: 1 Nisan 2026"
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
