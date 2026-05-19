import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type Battery = { id: number; name: string; percentage: number };
type Turbine = { id: number | string; name: string; batteries: Battery[] };

type Props = {
  turbines: Turbine[];
  alertThresholdPct?: number;
  onBatteryFull?: (turbineName: string, batteryName: string) => void;
};

export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function sendBatteryFullNotification(turbineName: string, batteryName: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🔋 Batterie pleine !",
      body: `${batteryName} de ${turbineName} est complètement chargée.`,
      sound: true,
    },
    trigger: null,
  });
}

export async function sendBatteryAlertNotification(turbineName: string, batteryName: string, pct: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "⚡ Batterie presque pleine",
      body: `${batteryName} de ${turbineName} est à ${Math.round(pct)}%.`,
      sound: true,
    },
    trigger: null,
  });
}

export default function NotificationManager({ turbines, alertThresholdPct = 90, onBatteryFull }: Props) {
  const notifiedFull = useRef<Set<string>>(new Set());
  const notifiedAlert = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fullBatteries: { turbineName: string; batteryName: string }[] = [];

    turbines.forEach((turbine) => {
      turbine.batteries.forEach((battery) => {
        const key = `${turbine.id}-${battery.id}`;

        if (battery.percentage >= 100 && !notifiedFull.current.has(key)) {
          notifiedFull.current.add(key);
          fullBatteries.push({ turbineName: turbine.name, batteryName: battery.name });
        }

        if (
          battery.percentage >= alertThresholdPct &&
          battery.percentage < 100 &&
          !notifiedAlert.current.has(key)
        ) {
          notifiedAlert.current.add(key);
          sendBatteryAlertNotification(turbine.name, battery.name, battery.percentage);
        }

        if (battery.percentage < alertThresholdPct) {
          notifiedAlert.current.delete(key);
          notifiedFull.current.delete(key);
        }
      });
    });

    if (fullBatteries.length === 1) {
      sendBatteryFullNotification(fullBatteries[0].turbineName, fullBatteries[0].batteryName);
      onBatteryFull?.(fullBatteries[0].turbineName, fullBatteries[0].batteryName);
    } else if (fullBatteries.length > 1) {
      const names = fullBatteries.map((b) => b.batteryName).join(", ");
      sendBatteryFullNotification("HydroTech", `${fullBatteries.length} batteries pleines`);
      onBatteryFull?.("HydroTech", `${names} sont pleines`);
    }
  }, [turbines, alertThresholdPct]);

  return null;
}
