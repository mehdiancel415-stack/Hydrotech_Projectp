import { View, Text, StyleSheet } from "react-native";
import Svg, { Polyline, Line, Circle } from "react-native-svg";
import { theme } from "../constants/theme";

type Props = {
  history: number[]; // valeurs de puissance (W) — ordonnées du plus ancien au plus récent
  width?: number;
  height?: number;
  label?: string;
};

export default function PowerChart({ history, width = 280, height = 80, label }: Props) {
  if (history.length < 2) {
    return (
      <View style={[styles.container, { width, height: height + 30 }]}>
        {label && <Text style={styles.label}>{label}</Text>}
        <View style={[styles.empty, { width, height }]}>
          <Text style={styles.emptyTxt}>Collecte des données...</Text>
        </View>
      </View>
    );
  }

  const max = Math.max(...history, 1);
  const min = Math.min(...history, 0);
  const range = max - min || 1;

  const padX = 8;
  const padY = 8;
  const innerW = width - 2 * padX;
  const innerH = height - 2 * padY;

  const points = history
    .map((v, i) => {
      const x = padX + (i / (history.length - 1)) * innerW;
      const y = padY + innerH - ((v - min) / range) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const lastPoint = history[history.length - 1];
  const lastX = padX + innerW;
  const lastY = padY + innerH - ((lastPoint - min) / range) * innerH;

  return (
    <View style={[styles.container, { width }]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Svg width={width} height={height}>
        {/* Ligne baseline */}
        <Line
          x1={padX}
          y1={padY + innerH}
          x2={padX + innerW}
          y2={padY + innerH}
          stroke={theme.border}
          strokeWidth={0.5}
        />
        {/* Courbe */}
        <Polyline
          points={points}
          fill="none"
          stroke={theme.accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Point dernière valeur */}
        <Circle cx={lastX} cy={lastY} r={3} fill={theme.accent} />
      </Svg>
      <View style={styles.range}>
        <Text style={styles.rangeTxt}>{min.toFixed(0)} W</Text>
        <Text style={styles.rangeTxt}>{max.toFixed(0)} W</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  label: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: theme.textSecondary,
    textTransform: "uppercase",
  },
  empty: {
    backgroundColor: theme.bgCard,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTxt: { fontSize: 10, color: theme.textSecondary },
  range: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6 },
  rangeTxt: { fontSize: 9, color: theme.textSecondary },
});
