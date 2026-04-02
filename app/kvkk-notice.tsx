import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { typography } from '@/lib/typography';

const sections = [
  {
    title: 'Veri Sorumlusu',
    body:
      'CepteCari uygulamasi kapsaminda hesap, firma ve is kayitlarinin islenmesine iliskin veri sorumlusu uygulamayi sunan isletmedir.',
  },
  {
    title: 'Islenen Veri Kategorileri',
    body:
      'Kimlik ve iletisim verileri, firma bilgileri, musteri ve tedarikci kayitlari, satis ve odeme hareketleri, stok ve tahsilat hatirlatma kayitlari islenebilir.',
  },
  {
    title: 'Isleme Amaclari',
    body:
      'Hesap yonetimi, veri senkronizasyonu, uygulama guvenligi, destek surecleri, bildirim gonderimi ve yasal yukumluluklerin yerine getirilmesi amaclariyla veri islenir.',
  },
  {
    title: 'Aktarim ve Saklama',
    body:
      'Veriler yalnizca hizmetin yurutulmesi icin gerekli altyapi saglayicilarla ve hukuki zorunluluk hallerinde yetkili mercilerle paylasilabilir. Veriler aktif hesap suresince veya yasal saklama sureleri boyunca tutulur.',
  },
  {
    title: 'Ilgili Kisi Haklari',
    body:
      'Kullanicilar veri erisim, duzeltme, silme, itiraz ve bilgi talebi gibi kanuni haklarini destek kanali uzerinden kullanabilir.',
  },
];

export default function KvkkNoticeScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BrandHeroHeader
        kicker="KVKK"
        title="Aydinlatma Metni"
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
