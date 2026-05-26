import { Share } from "react-native";

/**
 * Génère un CSV des turbines + batteries et le partage via le sélecteur natif Android/iOS.
 * Utilise l'API Share de React Native (pas de dépendance externe).
 */
export async function exportTurbinesCSV(turbines: any[]): Promise<void> {
  const lines: string[] = [];
  lines.push(
    "turbine_id,turbine_name,status,power_w,energy_wh,connected_at,battery_id,battery_name,battery_type,capacity_ah,percentage",
  );
  for (const t of turbines) {
    const batts = t.batteries || [];
    if (batts.length === 0) {
      lines.push(
        `${t.id},${esc(t.name)},${esc(t.status)},${(t.power || 0).toFixed(2)},${(t.energy || 0).toFixed(2)},${esc(t.connectedAt)},,,,,`,
      );
    } else {
      for (const b of batts) {
        lines.push(
          `${t.id},${esc(t.name)},${esc(t.status)},${(t.power || 0).toFixed(2)},${(t.energy || 0).toFixed(2)},${esc(t.connectedAt)},${b.id},${esc(b.name)},${esc(b.type)},${b.capacity},${b.percentage.toFixed(1)}`,
        );
      }
    }
  }
  const csv = lines.join("\n");

  await Share.share({
    title: `HydroTech export ${new Date().toISOString().slice(0, 10)}`,
    message: csv,
  });
}

function esc(v: any): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
