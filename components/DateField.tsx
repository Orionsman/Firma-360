import { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { CalendarDays } from 'lucide-react-native';
import { typography } from '@/lib/typography';

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textColor: string;
  mutedColor: string;
  backgroundColor: string;
  borderColor: string;
  accentColor: string;
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
};

export function DateField({
  label,
  value,
  onChange,
  textColor,
  mutedColor,
  backgroundColor,
  borderColor,
  accentColor,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);

  const selectedDate = useMemo(() => parseDate(value), [value]);

  const handleChange = (event: DateTimePickerEvent, nextDate?: Date) => {
    if (Platform.OS !== 'ios') {
      setOpen(false);
    }

    if (event.type === 'dismissed' || !nextDate) {
      return;
    }

    onChange(formatDate(nextDate));
  };

  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: mutedColor }]}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.trigger,
          {
            backgroundColor,
            borderColor,
          },
        ]}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
      >
        <Text style={[styles.value, { color: textColor }]}>
          {selectedDate.toLocaleDateString('tr-TR')}
        </Text>
        <CalendarDays size={18} color={accentColor} />
      </TouchableOpacity>

      {open ? (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: 20,
  },
  label: {
    ...typography.label,
    fontSize: 14,
    marginBottom: 8,
  },
  trigger: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    ...typography.heading,
    fontSize: 16,
  },
});
