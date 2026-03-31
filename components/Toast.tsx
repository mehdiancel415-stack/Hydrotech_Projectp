import { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, PanResponder } from 'react-native';
import { theme } from '../constants/theme';

type Props = {
  message: string;
  visible: boolean;
  onHide: () => void;
};

export default function Toast({ message, visible, onHide }: Props) {
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 60,
        useNativeDriver: true,
      }).start();
      const timer = setTimeout(() => {
        hideToast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.spring(translateY, {
      toValue: -100,
      useNativeDriver: true,
    }).start(() => onHide());
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      if (gesture.dy < 0) {
        translateY.setValue(60 + gesture.dy);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy < -30 || gesture.vy < -0.5) {
        hideToast();
      } else {
        Animated.spring(translateY, {
          toValue: 60,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }] }]}
      {...panResponder.panHandlers}
    >
      <Text style={styles.icon}>🔋</Text>
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.swipeTxt}>↑ glisser</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 999,
    backgroundColor: '#0f2040',
    borderWidth: 0.5,
    borderColor: theme.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  icon: { fontSize: 20 },
  message: { flex: 1, fontSize: 13, color: theme.textPrimary, fontWeight: '500' },
  swipeTxt: { fontSize: 10, color: theme.textSecondary },
});