import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme, fontFamily, radius } from '../constants/theme';

type TurbineItem = { id: number | string; name: string; power: number; status: string };

type Props = {
  turbines: TurbineItem[];
  activeId: number | string | null;
  onSelect: (id: number | string) => void;
  onAdd: () => void;
};

export default function TurbineSelector({ turbines, activeId, onSelect, onAdd }: Props) {
  if (turbines.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.scroll}
    >
      {turbines.map((t) => {
        const active = t.id === activeId;
        const statusColor = t.status === 'En marche' ? theme.success : theme.warning;
        return (
          <TouchableOpacity
            key={t.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(t.id)}
            activeOpacity={0.72}
          >
            <View style={[styles.dot, { backgroundColor: statusColor }]} />
            <Text style={[styles.name, active && styles.nameActive]} numberOfLines={1}>
              {t.name}
            </Text>
            <Text style={[styles.power, active && styles.powerActive]}>
              {Math.round(t.power)}W
            </Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity style={styles.addChip} onPress={onAdd} activeOpacity={0.72}>
        <Text style={styles.addTxt}>+ Ajouter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginBottom: 4 },
  content: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: theme.bgCard,
    borderWidth: 0.5, borderColor: theme.border,
    borderRadius: radius.full,
    paddingHorizontal: 14, paddingVertical: 9,
    maxWidth: 180,
  },
  chipActive: {
    borderColor: theme.accent,
    backgroundColor: theme.accent + '12',
  },
  dot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  name: {
    fontFamily: fontFamily.medium, fontSize: 12,
    color: theme.textSecondary, flexShrink: 1,
  },
  nameActive: { color: theme.textPrimary },
  power: {
    fontFamily: fontFamily.monoRegular, fontSize: 11,
    color: theme.textMuted,
  },
  powerActive: { color: theme.accent },
  addChip: {
    backgroundColor: theme.bgCard,
    borderWidth: 0.5, borderColor: theme.border,
    borderRadius: radius.full,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  addTxt: { fontFamily: fontFamily.medium, fontSize: 12, color: theme.textMuted },
});
