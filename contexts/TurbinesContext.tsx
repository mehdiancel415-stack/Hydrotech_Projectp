import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'hydrotech_turbines_v2';
const SESSIONS_KEY = 'hydrotech_sessions_v2';
const CO2_PER_WH = 0.000233; // kg CO2 par Wh (mix énergétique FR)

export type Battery = {
  id: number;
  name: string;
  type: string;
  capacity: number;
  percentage: number;
};

export type Turbine = {
  id: number | string;
  name: string;
  status: string;
  power: number;
  voltage?: number;
  current?: number;
  flowRate: number;
  energy: number;
  connectedAt: string;
  location: { latitude: number; longitude: number } | null;
  batteries: Battery[];
  powerHistory: number[];
};

export type Session = {
  id: string;
  turbineId: number | string;
  turbineName: string;
  startedAt: number;
  endedAt: number | null;
  totalEnergy: number;
  peakPower: number;
  co2Saved: number;
  powerSamples: number[];
};

type ContextValue = {
  turbines: Turbine[];
  activeTurbineId: number | string | null;
  setActiveTurbineId: (id: number | string) => void;
  addTurbine: (t: Omit<Turbine, 'energy' | 'powerHistory'>) => void;
  removeTurbine: (id: number | string) => void;
  updateTurbineData: (id: number | string, data: { power?: number; voltage?: number; current?: number }) => void;
  updateBatteries: (turbineId: number | string, batteries: Battery[]) => void;
  setBatteryPct: (turbineId: number | string, batteryId: number, pct: number) => void;
  currentSession: Session | null;
  sessions: Session[];
  totalEnergyAllSessions: number;
  totalCo2Saved: number;
  deleteSession: (id: string) => void;
  clearEndedSessions: () => void;
};

const TurbinesContext = createContext<ContextValue | null>(null);

export function TurbinesProvider({ children }: { children: React.ReactNode }) {
  const [turbines, setTurbines] = useState<Turbine[]>([]);
  const [activeTurbineId, setActiveTurbineId] = useState<number | string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  // Debounce refs pour éviter les write storms sur AsyncStorage
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Chargement initial ─────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((d) => {
      if (!d) return;
      try {
        const p = JSON.parse(d);
        if (Array.isArray(p.turbines)) setTurbines(p.turbines);
        if (p.activeTurbineId != null) setActiveTurbineId(p.activeTurbineId);
      } catch {}
    }).catch(() => {});
    AsyncStorage.getItem(SESSIONS_KEY).then((d) => {
      if (!d) return;
      try { setSessions(JSON.parse(d)); } catch {}
    }).catch(() => {});
  }, []);

  // ── Sauvegarde debounced (2s) ──────────────────────────────────────────────
  const scheduleSaveTurbines = useCallback((t: Turbine[], id: number | string | null) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ turbines: t, activeTurbineId: id })).catch(() => {});
    }, 2000);
  }, []);

  const scheduleSaveSessions = useCallback((s: Session[]) => {
    if (sessionsTimer.current) clearTimeout(sessionsTimer.current);
    sessionsTimer.current = setTimeout(() => {
      AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(s.slice(0, 50))).catch(() => {});
    }, 2000);
  }, []);

  // ── Cleanup timers au démontage ────────────────────────────────────────────
  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (sessionsTimer.current) clearTimeout(sessionsTimer.current);
  }, []);

  // ── addTurbine ─────────────────────────────────────────────────────────────
  const addTurbine = useCallback((t: Omit<Turbine, 'energy' | 'powerHistory'>) => {
    const turbine: Turbine = { ...t, energy: 0, powerHistory: [t.power || 0] };
    setTurbines((prev) => {
      const next = [...prev, turbine];
      scheduleSaveTurbines(next, t.id);
      return next;
    });
    setActiveTurbineId(t.id);
    const session: Session = {
      id: `${t.id}-${Date.now()}`,
      turbineId: t.id,
      turbineName: t.name,
      startedAt: Date.now(),
      endedAt: null,
      totalEnergy: 0,
      peakPower: t.power || 0,
      co2Saved: 0,
      powerSamples: [t.power || 0],
    };
    setSessions((prev) => {
      const next = [session, ...prev];
      scheduleSaveSessions(next);
      return next;
    });
  }, [scheduleSaveTurbines, scheduleSaveSessions]);

  // ── removeTurbine ──────────────────────────────────────────────────────────
  const removeTurbine = useCallback((id: number | string) => {
    setTurbines((prev) => {
      const next = prev.filter((t) => t.id !== id);
      scheduleSaveTurbines(next, null);
      return next;
    });
    setSessions((prev) => {
      const next = prev.map((s) =>
        s.turbineId === id && s.endedAt === null ? { ...s, endedAt: Date.now() } : s,
      );
      scheduleSaveSessions(next);
      return next;
    });
    setActiveTurbineId((prev) => (prev === id ? null : prev));
  }, [scheduleSaveTurbines, scheduleSaveSessions]);

  // ── updateTurbineData — appelé depuis BLE ─────────────────────────────────
  const updateTurbineData = useCallback((
    id: number | string,
    data: { power?: number; voltage?: number; current?: number },
  ) => {
    const now = Date.now();
    setTurbines((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const newPower = data.power ?? t.power;
        const history = [...(t.powerHistory ?? []), newPower].slice(-60); // max 60 points
        return { ...t, ...data, power: newPower, powerHistory: history };
      }),
    );
    // Met aussi à jour la session en cours
    setSessions((prev) =>
      prev.map((s) => {
        if (s.turbineId !== id || s.endedAt !== null || data.power === undefined) return s;
        const p = data.power;
        const dtHours = 1 / 120; // ~30s interval assumed
        const newEnergy = s.totalEnergy + p * dtHours;
        return {
          ...s,
          powerSamples: [...s.powerSamples, p].slice(-120),
          peakPower: Math.max(s.peakPower, p),
          totalEnergy: newEnergy,
          co2Saved: newEnergy * CO2_PER_WH,
        };
      }),
    );
  }, []);

  // ── updateBatteries ────────────────────────────────────────────────────────
  const updateBatteries = useCallback((turbineId: number | string, batteries: Battery[]) => {
    setTurbines((prev) => {
      const next = prev.map((t) => (t.id === turbineId ? { ...t, batteries } : t));
      scheduleSaveTurbines(next, turbineId);
      return next;
    });
  }, [scheduleSaveTurbines]);

  // ── setBatteryPct ──────────────────────────────────────────────────────────
  const setBatteryPct = useCallback(
    (turbineId: number | string, batteryId: number, pct: number) => {
      setTurbines((prev) =>
        prev.map((t) =>
          t.id !== turbineId ? t : {
            ...t,
            batteries: t.batteries.map((b) =>
              b.id === batteryId ? { ...b, percentage: Math.min(100, Math.max(0, pct)) } : b,
            ),
          },
        ),
      );
    },
    [],
  );

  // ── deleteSession ──────────────────────────────────────────────────────────
  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      scheduleSaveSessions(next);
      return next;
    });
  }, [scheduleSaveSessions]);

  // ── clearEndedSessions ─────────────────────────────────────────────────────
  const clearEndedSessions = useCallback(() => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.endedAt === null);
      scheduleSaveSessions(next);
      return next;
    });
  }, [scheduleSaveSessions]);

  const currentSession =
    sessions.find((s) => s.turbineId === activeTurbineId && s.endedAt === null) ?? null;
  const totalEnergyAllSessions = sessions.reduce((sum, s) => sum + s.totalEnergy, 0);
  const totalCo2Saved = sessions.reduce((sum, s) => sum + s.co2Saved, 0);

  return (
    <TurbinesContext.Provider value={{
      turbines, activeTurbineId, setActiveTurbineId,
      addTurbine, removeTurbine, updateTurbineData,
      updateBatteries, setBatteryPct,
      currentSession, sessions, totalEnergyAllSessions, totalCo2Saved,
      deleteSession, clearEndedSessions,
    }}>
      {children}
    </TurbinesContext.Provider>
  );
}

export function useTurbines() {
  const ctx = useContext(TurbinesContext);
  if (!ctx) throw new Error('useTurbines must be used within TurbinesProvider');
  return ctx;
}
