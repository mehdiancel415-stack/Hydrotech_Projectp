import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';

const SCREEN_W = Dimensions.get('window').width;
const MARGIN_H = 20;
const BAR_W = SCREEN_W - MARGIN_H * 2;
const TAB_H = 68;

type Route = { key: string; name: string };
type Props = {
  state: { index: number; routes: Route[] };
  navigation: any;
};

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  index: 'zap',
  map:   'map',
  logs:  'bar-chart-2',
  config:'settings',
};
const LABELS: Record<string, string> = {
  index: 'Live',
  map:   'Carte',
  logs:  'Logs',
  config:'Config',
};

export default function TabBar({ state, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom + 8, 16);

  const routes = state.routes.filter((r) => ICONS[r.name]);
  const activeIdx = routes.findIndex((r) => r.name === state.routes[state.index]?.name);
  const TAB_W = BAR_W / routes.length;

  const pillX = useSharedValue(activeIdx * TAB_W);

  useEffect(() => {
    pillX.value = withSpring(activeIdx * TAB_W, { damping: 24, stiffness: 360 });
  }, [activeIdx]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
  }));

  return (
    <View style={[styles.container, { bottom }]}>
      {/* Active background pill */}
      <Animated.View style={[styles.activePill, { width: TAB_W }, pillStyle]} />

      {routes.map((route, i) => {
        const focused = i === activeIdx;
        const iconColor = focused ? '#FFFFFF' : 'rgba(255,255,255,0.5)';
        const iconName = ICONS[route.name] ?? 'circle';

        return (
          <Pressable
            key={route.key}
            style={styles.tab}
            onPress={() => {
              if (!focused) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
          >
            <Feather name={iconName} size={focused ? 22 : 21} color={iconColor} />
            <Text style={[styles.label, { color: iconColor, fontFamily: focused ? fontFamily.semibold : fontFamily.regular }]}>
              {LABELS[route.name] ?? route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: MARGIN_H,
    width: BAR_W,
    height: TAB_H,
    flexDirection: 'row',
    backgroundColor: '#1B4F9B',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    shadowColor: '#1B4F9B',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  activePill: {
    position: 'absolute',
    top: 8,
    left: 0,
    height: TAB_H - 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 4,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
