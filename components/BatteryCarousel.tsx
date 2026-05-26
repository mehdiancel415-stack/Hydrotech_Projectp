import {
  View, Text, StyleSheet, Dimensions,
  NativeSyntheticEvent, NativeScrollEvent, TouchableOpacity,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useState } from 'react';
import { theme, fontFamily, radius } from '../constants/theme';
import BatteryRing from './BatteryRing';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - 48;

type Battery = { id: number; name: string; type: string; capacity: number; percentage: number };

type Props = {
  batteries: Battery[];
  onDelete?: (id: number) => void;
  onEdit?: (battery: Battery) => void;
};

export default function BatteryCarousel({ batteries, onDelete, onEdit }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setActiveIndex(Math.round(x / (CARD_WIDTH + 12)));
  };

  if (batteries.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyIcon}>🔋</Text>
        <Text style={styles.emptyTxt}>Aucune batterie ajoutée</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Batteries</Text>
        <Text style={styles.counter}>{activeIndex + 1} / {batteries.length}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 12}
        snapToAlignment="start"
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
      >
        {batteries.map((b) => {
          const color =
            b.percentage >= 80 ? theme.success :
            b.percentage >= 40 ? theme.accent :
            b.percentage >= 20 ? theme.warning :
            theme.danger;
          const remaining = (b.capacity * (1 - b.percentage / 100)).toFixed(1);
          const isFull = b.percentage >= 100;

          return (
            <View key={b.id} style={styles.card}>
              {/* Accent bar top */}
              <View style={[styles.accentBar, { backgroundColor: color }]} />

              <View style={styles.cardBody}>
                {/* Left: ring */}
                <BatteryRing percentage={b.percentage} size={72} strokeWidth={7} showLabel />

                {/* Right: info */}
                <View style={styles.info}>
                  <Text style={styles.battName} numberOfLines={1}>{b.name}</Text>
                  <Text style={styles.battType}>{b.type} · {b.capacity} Ah</Text>

                  <View style={styles.tags}>
                    <View style={[styles.tag, { borderColor: color + '55', backgroundColor: color + '10' }]}>
                      <Text style={[styles.tagTxt, { color }]}>
                        {isFull ? '✓ Pleine' : `${remaining} Ah restants`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actions}>
                    {onEdit && (
                      <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(b)} activeOpacity={0.75}>
                        <Text style={styles.editTxt}>Modifier</Text>
                      </TouchableOpacity>
                    )}
                    {onDelete && (
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(b.id)} activeOpacity={0.75}>
                        <Text style={styles.deleteTxt}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {batteries.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: {
    fontFamily: fontFamily.semibold, fontSize: 11,
    letterSpacing: 1.8, color: theme.textSecondary, textTransform: 'uppercase',
  },
  counter: { fontFamily: fontFamily.monoRegular, fontSize: 11, color: theme.textMuted },
  scrollContent: { paddingRight: 16, gap: 12 },

  card: {
    width: CARD_WIDTH,
    backgroundColor: theme.bgCard,
    borderWidth: 0.5, borderColor: theme.border,
    borderRadius: radius.md, overflow: 'hidden',
  },
  accentBar: { height: 2 },
  cardBody: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },

  info: { flex: 1, gap: 6 },
  battName: { fontFamily: fontFamily.semibold, fontSize: 14, color: theme.textPrimary },
  battType: { fontFamily: fontFamily.regular, fontSize: 11, color: theme.textSecondary },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    borderWidth: 0.5, borderRadius: radius.sm,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  tagTxt: { fontFamily: fontFamily.medium, fontSize: 11 },

  actions: { flexDirection: 'row', gap: 6, marginTop: 2 },
  editBtn: {
    flex: 1, backgroundColor: theme.accent + '12',
    borderWidth: 0.5, borderColor: theme.accent + '55',
    borderRadius: radius.sm, paddingVertical: 7, alignItems: 'center',
  },
  editTxt: { fontFamily: fontFamily.semibold, fontSize: 11, color: theme.accent },
  deleteBtn: {
    width: 34, height: 34,
    backgroundColor: theme.danger + '10',
    borderWidth: 0.5, borderColor: theme.danger + '44',
    borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
  },
  deleteTxt: { fontFamily: fontFamily.semibold, fontSize: 13, color: theme.danger },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: theme.border },
  dotActive: { width: 16, backgroundColor: theme.accent, borderRadius: 3 },

  emptyCard: {
    backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border,
    borderRadius: radius.md, padding: 24, alignItems: 'center', gap: 8,
  },
  emptyIcon: { fontSize: 28 },
  emptyTxt: { fontFamily: fontFamily.regular, fontSize: 13, color: theme.textSecondary },
});
