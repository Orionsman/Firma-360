import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { formatTRY } from '@/lib/format';

type ReminderNotificationRow = {
  id: string;
  title: string;
  note?: string | null;
  amount?: number | null;
  due_date: string;
  status: 'pending' | 'completed' | 'dismissed';
  customers?: { name: string } | null;
};

const STORAGE_KEY = 'cepte_cari_collection_notifications';

export const initializeReminderNotifications = async () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('collection-reminders', {
      name: 'Tahsilat Hatirlatmalari',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1A0D45',
    });
  }
};

export const requestReminderNotificationPermission = async () => {
  if (Platform.OS === 'web') {
    return false;
  }

  const settings = await Notifications.getPermissionsAsync();
  if (
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }

  const response = await Notifications.requestPermissionsAsync();
  return (
    response.granted ||
    response.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
};

const loadScheduledMap = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Record<string, string>) : {};
};

const saveScheduledMap = async (value: Record<string, string>) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
};

const buildReminderDate = (dueDate: string) => {
  const [year, month, day] = dueDate.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1, 9, 0, 0, 0);

  if (date.getTime() <= Date.now()) {
    return null;
  }

  return date;
};

export const syncCollectionReminderNotifications = async (
  reminders: ReminderNotificationRow[]
) => {
  if (Platform.OS === 'web') {
    return;
  }

  const hasPermission = await requestReminderNotificationPermission();
  if (!hasPermission) {
    return;
  }

  const existingMap = await loadScheduledMap();
  const nextMap: Record<string, string> = {};
  const pendingReminders = reminders.filter((reminder) => reminder.status === 'pending');

  for (const scheduledId of Object.values(existingMap)) {
    await Notifications.cancelScheduledNotificationAsync(scheduledId).catch(() => undefined);
  }

  for (const reminder of pendingReminders) {
    const triggerDate = buildReminderDate(reminder.due_date);
    if (!triggerDate) {
      continue;
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: `${reminder.customers?.name ? `${reminder.customers.name} - ` : ''}${reminder.note || 'Tahsilat tarihi geldi.'}${reminder.amount ? ` - ${formatTRY(Number(reminder.amount))}` : ''}`,
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: 'collection-reminders',
      },
    });

    nextMap[reminder.id] = identifier;
  }

  await saveScheduledMap(nextMap);
};
