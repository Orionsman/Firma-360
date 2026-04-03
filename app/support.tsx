import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandHeroHeader } from '@/components/BrandHeroHeader';
import { t } from '@/lib/i18n';
import { typography } from '@/lib/typography';

export default function SupportScreen() {
  const isTr = t.locale() === 'tr';

  const contactItems = isTr
    ? [
        {
          title: 'Uygulama İçindeki Kanallar',
          body:
            'Hesap bilgilerinizi, şifrenizi ve hesap silme taleplerinizi uygulama içindeki Ayarlar ekranından yönetebilirsiniz.',
        },
        {
          title: 'Destek Talepleri',
          body:
            'Kullanıcı başvuruları, veri talepleri ve mağaza inceleme süreçlerinde kullanılmak üzere aktif bir destek e-postası ve destek URL’si tanımlamanız önerilir.',
        },
        {
          title: 'Yanıt Süreci',
          body:
            'Veri talebi, teknik hata veya hesap sorunu gibi destek kayıtları makul sürede kayda alınmalı ve sonuç kullanıcıya yazılı olarak dönülmelidir.',
        },
      ]
    : [
        {
          title: 'In-App Channels',
          body:
            'You can manage your account details, password, and account deletion requests from the Settings screen inside the app.',
        },
        {
          title: 'Support Requests',
          body:
            'It is recommended to define an active support email address and support URL for user requests, data access requests, and store review processes.',
        },
        {
          title: 'Response Process',
          body:
            'Support records such as data requests, technical issues, or account problems should be logged within a reasonable time and responded to in writing.',
        },
      ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BrandHeroHeader
        kicker={isTr ? 'DESTEK' : 'SUPPORT'}
        title={isTr ? 'Destek Bilgileri' : 'Support Information'}
        subtitle={isTr ? 'Son güncelleme: 1 Nisan 2026' : 'Last updated: April 1, 2026'}
      />

      {contactItems.map((section) => (
        <View key={section.title} style={styles.card}>
          <Text style={styles.cardTitle}>{section.title}</Text>
          <Text style={styles.cardBody}>{section.body}</Text>
        </View>
      ))}

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>{isTr ? 'Önemli Not' : 'Important Note'}</Text>
        <Text style={styles.noteText}>
          {isTr
            ? 'Mağazaya çıkmadan önce geçerli bir destek e-postası ve destek web sayfası belirlemeniz gerekir. Bu bilgi App Store Connect ve Google Play Console içinde manuel olarak girilir.'
            : 'Before publishing to the stores, you need a valid support email address and support web page. This information is entered manually in App Store Connect and Google Play Console.'}
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
