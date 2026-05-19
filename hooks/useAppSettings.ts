import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'hydrotech_app_settings_v1';

export type AppSettings = {
  bleAutoReconnect: boolean;
  refreshRateSec: number;
  offlineMapEnabled: boolean;
  alertThresholdPct: number;
};

const DEFAULT_SETTINGS: AppSettings = {
  bleAutoReconnect: true,
  refreshRateSec: 10,
  offlineMapEnabled: true,
  alertThresholdPct: 95,
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((d) => {
      if (!d) return;
      try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(d) }); } catch {}
    });
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { settings, update };
}
