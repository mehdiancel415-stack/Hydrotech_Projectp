import { View } from 'react-native';
import Svg, { Polyline, Line, Path } from 'react-native-svg';
import { theme } from '../constants/theme';

type Props = { samples: number[]; width: number; height: number };

export default function SessionChart({ samples, width, height }: Props) {
  if (!samples || samples.length < 2) {
    return (
      <View
        style={{
          width, height,
          backgroundColor: theme.bgElevated,
          borderRadius: 8,
        }}
      />
    );
  }

  const padX = 4;
  const padY = 8;
  const w = width - padX * 2;
  const h = height - padY * 2;
  const maxVal = Math.max(...samples, 1);

  const pts = samples.map((v, i) => ({
    x: padX + (i / (samples.length - 1)) * w,
    y: padY + h - (v / maxVal) * h,
  }));

  const linePoints = pts.map((p) => `${p.x},${p.y}`).join(' ');

  // Area fill path
  const areaPath = [
    `M ${pts[0].x} ${padY + h}`,
    ...pts.map((p) => `L ${p.x} ${p.y}`),
    `L ${pts[pts.length - 1].x} ${padY + h}`,
    'Z',
  ].join(' ');

  return (
    <Svg width={width} height={height}>
      {/* Mid grid */}
      <Line
        x1={padX} y1={padY + h / 2}
        x2={padX + w} y2={padY + h / 2}
        stroke={theme.border} strokeWidth={0.5} strokeDasharray="4,4"
      />
      {/* Area */}
      <Path d={areaPath} fill={theme.accent} opacity={0.07} />
      {/* Line */}
      <Polyline
        points={linePoints}
        fill="none" stroke={theme.accent} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}
