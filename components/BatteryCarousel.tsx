import { View, Text, StyleSheet, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { theme } from '../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - 48;

type Battery = {
  id: number;
  name: string;
  type: string;
  capacity: number;
  percentage: number;
};

type Props = {
  batteries: Battery[];
  onDelete?: (id: number) => void;
};

export default function BatteryCarousel({ batteries, onDelete }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / (CARD_WIDTH + 12));
    setActiveIndex(index);
  };

  if (batteries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
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
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 12}
        snapToAlignment="start"
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {batteries.map((b) => {
          const color = b.percentage > 60 ? theme.accent : b.percentage > 30 ? theme.warning : theme.danger;
          const remaining = (b.capacity * (1 - b.percentage / 100)).toFixed(1);
          const totalH = (b.capacity * (1 - b.percentage / 100)) / (18 / 12);
          const etaH = Math.floor(totalH);
          const etaM = Math.round((totalH - etaH) * 60);
          return (
            <View key={b.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.battName}>{b.name}</Text>
                  <Text style={styles.battType}>{b.type} · {b.capacity}Ah</Text>
                </View>
                <Text style={[styles.battPct, { color }]}>{Math.round(b.percentage)}%</Text>
              </View>
              <View style={styles.barWrap}>
                <View style={[styles.bar, { width: `${b.percentage}%` as any, backgroundColor: color }]} />
              </View>
              <View style={styles.tags}>
                <View style={styles.tag}>
                  <Text style={styles.tagTxt}>{remaining} Ah restants</Text>
                </View>
                <View style={styles.tag}>
                  <Text style={styles.tagTxt}>~{etaH}h {etaM}min</Text>
                </View>
              </View>
              {onDelete && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => onDelete(b.id)}
                >
                  <Text style={styles.deleteTxt}>Supprimer la batterie</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.dots}>
        {batteries.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 9, letterSpacing: 2, color: theme.textSecondary, textTransform: 'uppercase' },
  counter: { fontSize: 10, color: theme.textSecondary },
  scrollContent: { paddingRight: 16, gap: 12 },
  card: { width: CARD_WIDTH, backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 12, padding: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  battName: { fontSize: 13, color: theme.textPrimary, fontWeight: '500' },
  battType: { fontSize: 10, color: theme.textSecondary, marginTop: 2 },
  battPct: { fontSize: 22, fontWeight: '500' },
  barWrap: { height: 5, backgroundColor: theme.bg, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  bar: { height: '100%', borderRadius: 3 },
  tags: { flexDirection: 'row', gap: 8 },
  tag: { backgroundColor: theme.bg, borderWidth: 0.5, borderColor: theme.border, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  tagTxt: { fontSize: 10, color: theme.textSecondary },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: theme.border },
  dotActive: { width: 14, backgroundColor: theme.accent },
  deleteBtn: { marginTop: 8, backgroundColor: '#1a0808', borderWidth: 0.5, borderColor: theme.danger, borderRadius: 8, padding: 8, alignItems: 'center' },
  deleteTxt: { color: theme.danger, fontSize: 11 },
  emptyContainer: { backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 12, padding: 20, alignItems: 'center' },
  emptyTxt: { fontSize: 13, color: theme.textSecondary },
});