export const BLE_CONFIG = {
  SERVICE_UUID: '12345678-1234-1234-1234-123456789012',
  CHARACTERISTIC_UUID: '87654321-4321-4321-4321-210987654321',
  DEVICE_NAME_PREFIX: 'HydroTech',
  REFRESH_INTERVAL: 10000,
};
 
export type TurbineData = {
  voltage: number;
  current: number;
  power: number;
  battery: number;
};
 
export function parseBLEData(raw: string): TurbineData | null {
  try {
    const data = JSON.parse(raw);
    const voltage = parseFloat(data.voltage) || 0;
    const current = parseFloat(data.current) || 0;
    const batteryVoltage = parseFloat(data.battery_voltage) || 0;
    return {
      voltage,
      current,
      power: voltage * current,
      battery: voltageToPercent(batteryVoltage, 'LiFePO4'),
    };
  } catch (e) {
    return null;
  }
}
 
export function voltageToPercent(voltage: number, type: string): number {
  const ranges: Record<string, [number, number]> = {
    'LiFePO4': [10.0, 13.6],
    'Li-ion': [10.0, 16.8],
    'Plomb': [11.8, 12.7],
  };
  const [min, max] = ranges[type] ?? [10.0, 13.6];
  const pct = Math.round((voltage - min) / (max - min) * 100);
  return Math.min(100, Math.max(0, pct));
}
 
export function calcTimeRemaining(
  batteries: { capacity: number; percentage: number; type: string }[],
  current: number
): { hours: number; minutes: number } {
  const totalRemaining = batteries.reduce((sum, b) => {
    return sum + b.capacity * (1 - b.percentage / 100);
  }, 0);
  if (current <= 0) return { hours: 0, minutes: 0 };
  const totalHours = totalRemaining / current;
  return {
    hours: Math.floor(totalHours),
    minutes: Math.round((totalHours - Math.floor(totalHours)) * 60),
  };
}
