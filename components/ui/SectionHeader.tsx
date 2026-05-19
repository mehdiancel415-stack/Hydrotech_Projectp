import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

type Props = { title: string; subtitle?: string };

export default function SectionHeader({ title, subtitle }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {/* Decorative gradient line */}
      <View style={styles.lineWrap}>
        <View style={styles.lineFade} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    marginTop: spacing.xl,
  },
  left: { gap: 2 },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  lineWrap: { flex: 1, height: 1 },
  lineFade: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
});
