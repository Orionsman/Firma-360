import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { t } from '@/lib/i18n';
import { typography } from '@/lib/typography';

export default function KvkkNoticeScreen() {
  const isTr = t.locale() === 'tr';

  const sections = isTr
    ? [
        {
          title: 'Veri Sorumlusu',
          body:
            'CepteCari uygulaması kapsamında hesap, firma ve iş kayıtlarının işlenmesine ilişkin veri sorumlusu uygulamayı sunan işletmedir.',
        },
        {
          title: 'İşlenen Veri Kategorileri',
          body:
            'Kimlik ve iletişim verileri, firma bilgileri, müşteri ve tedarikçi kayıtları, satış ve ödeme hareketleri, stok ve tahsilat hatırlatma kayıtları işlenebilir.',
        },
        {
          title: 'İşleme Amaçları',
          body:
            'Hesap yönetimi, veri senkronizasyonu, uygulama güvenliği, destek süreçleri, bildirim gönderimi ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla veri işlenir.',
        },
        {
          title: 'Aktarım ve Saklama',
          body:
            'Veriler yalnızca hizmetin yürütülmesi için gerekli altyapı sağlayıcılarla ve hukuki zorunluluk hâllerinde yetkili mercilerle paylaşılabilir. Veriler aktif hesap süresince veya yasal saklama süreleri boyunca tutulur.',
        },
        {
          title: 'İlgili Kişi Hakları',
          body:
            'Kullanıcılar veri erişim, düzeltme, silme, itiraz ve bilgi talebi gibi kanuni haklarını destek kanalı üzerinden kullanabilir.',
        },
      ]
    : [
        {
          title: 'Data Controller',
          body:
            'For the processing of account, company, and business records within the CepteCari application, the data controller is the business operating the app.',
        },
        {
          title: 'Processed Data Categories',
          body:
            'Identity and contact data, company information, customer and supplier records, sales and payment transactions, stock records, and collection reminder records may be processed.',
        },
        {
          title: 'Processing Purposes',
          body:
            'Data is processed for account management, data synchronization, app security, support processes, notification delivery, and compliance with legal obligations.',
        },
        {
          title: 'Transfer and Retention',
          body:
            'Data may only be shared with infrastructure providers necessary for service delivery and with authorized authorities where legally required. Data is retained while the account is active or for legally mandated retention periods.',
        },
        {
          title: 'Data Subject Rights',
          body:
            'Users can exercise legal rights such as access, correction, deletion, objection, and information requests through the support channel.',
        },
      ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BrandHeroHeader
        kicker="KVKK"
        title={isTr ? 'Aydınlatma Metni' : 'Privacy Notice'}
        subtitle={isTr ? 'Son güncelleme: 1 Nisan 2026' : 'Last updated: April 1, 2026'}
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
