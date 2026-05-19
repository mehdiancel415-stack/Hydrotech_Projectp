import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Switch, Alert,
} from "react-native";
import { useState } from "react";
import * as Location from "expo-location";
import { theme } from "../constants/theme";
import Toast from "./Toast";
import {
  preloadZoneWaterways, downloadOfflineTiles, clearAllCaches,
} from "./MapCacheManager";
import { exportTurbinesCSV } from "./ExportData";
import { AppSettings } from "../hooks/useAppSettings";

type Props = {
  visible: boolean;
  onClose: () => void;
  turbines: any[];
  onUpdateBatteries: (turbineId: number | string, batteries: any[]) => void;
  onTestToast?: () => void;
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  onOpenAbout: () => void;
  onReplayOnboarding: () => void;
  onZoneDownloaded?: (ways: any[]) => void;
};

export default function SettingsScreen({
  visible, onClose, turbines, settings, updateSettings, onOpenAbout, onReplayOnboarding, onZoneDownloaded,
}: Props) {
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [downloadingZone, setDownloadingZone] = useState(false);
  const [zoneProgress, setZoneProgress] = useState<string>("");
  const [exporting, setExporting] = useState(false);

  const triggerToast = (msg: string) => { setToastMessage(msg); setToastVisible(true); };

  const handleDownloadZone = async () => {
    if (downloadingZone) return;
    setDownloadingZone(true);
    setZoneProgress("Récupération de la position...");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        triggerToast("Permission de localisation refusée");
        setDownloadingZone(false); setZoneProgress(""); return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      setZoneProgress("Téléchargement des cours d'eau (1/2)...");
      const result = await preloadZoneWaterways(
        loc.coords.latitude, loc.coords.longitude,
        (done, total) => setZoneProgress(`Cours d'eau ${done}/${total}...`),
      );
      setZoneProgress("Téléchargement des tuiles carte (2/2)...");
      await downloadOfflineTiles(
        loc.coords.latitude, loc.coords.longitude,
        (pct) => setZoneProgress(`Tuiles carte ${Math.round(pct)}%...`),
      );
      triggerToast(
        `Zone OK : ${result.waterfalls} chute(s), ${result.rivers} rivière(s), ${result.streams} ruisseau(x)`,
      );
      // Pousser les ways téléchargés au parent → la carte se met à jour immédiatement
      onZoneDownloaded?.(result.ways);
    } catch (e: any) {
      triggerToast("Erreur : " + (e?.message || "inconnue"));
    } finally {
      setDownloadingZone(false); setZoneProgress("");
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      "Vider le cache",
      "Supprimer les cours d'eau, tuiles offline et itinéraires en cache ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: async () => {
          await clearAllCaches();
          triggerToast("Cache vidé");
        }},
      ],
    );
  };

  const handleExport = async () => {
    if (turbines.length === 0) { triggerToast("Aucune donnée à exporter"); return; }
    setExporting(true);
    try {
      await exportTurbinesCSV(turbines);
    } catch (e: any) {
      triggerToast("Erreur export : " + (e?.message || "inconnue"));
    } finally { setExporting(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onClose}>
            <Text style={styles.backTxt}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Paramètres</Text>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* === STATS GLOBALES === */}
          <Text style={styles.sectionLabel}>Production globale</Text>
          <View style={styles.card}>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{turbines.length}</Text>
                <Text style={styles.statLabel}>Turbines</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>
                  {Math.round(turbines.reduce((s, t) => s + (t.power || 0), 0))}<Text style={styles.statUnit}> W</Text>
                </Text>
                <Text style={styles.statLabel}>Puissance</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>
                  {turbines.reduce((s, t) => s + (t.energy || 0), 0).toFixed(1)}<Text style={styles.statUnit}> Wh</Text>
                </Text>
                <Text style={styles.statLabel}>Énergie</Text>
              </View>
            </View>
          </View>

          {/* === CONNEXION === */}
          <Text style={styles.sectionLabel}>Connexion</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>Reconnexion automatique</Text>
                <Text style={styles.rowSub}>Se reconnecter si signal perdu</Text>
              </View>
              <Switch
                value={settings.bleAutoReconnect}
                onValueChange={(v) => updateSettings({ bleAutoReconnect: v })}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={settings.bleAutoReconnect ? theme.accent : theme.textSecondary}
              />
            </View>
            <View style={styles.separator} />
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>Intervalle de rafraîchissement</Text>
                <Text style={styles.rowSub}>Mise à jour des données turbine ({settings.refreshRateSec}s)</Text>
              </View>
              <View style={styles.rateRow}>
                {[3, 5, 10, 30].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.rateBtn, settings.refreshRateSec === r && styles.rateBtnActive]}
                    onPress={() => updateSettings({ refreshRateSec: r })}
                  >
                    <Text style={[styles.rateTxt, settings.refreshRateSec === r && styles.rateTxtActive]}>
                      {r}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* === ALERTES === */}
          <Text style={styles.sectionLabel}>Alertes</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>Seuil "presque pleine"</Text>
                <Text style={styles.rowSub}>Notification quand batterie ≥ {settings.alertThresholdPct}%</Text>
              </View>
              <View style={styles.rateRow}>
                {[80, 90, 95].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.rateBtn, settings.alertThresholdPct === r && styles.rateBtnActive]}
                    onPress={() => updateSettings({ alertThresholdPct: r })}
                  >
                    <Text style={[styles.rateTxt, settings.alertThresholdPct === r && styles.rateTxtActive]}>
                      {r}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* === CARTE OFFLINE === */}
          <Text style={styles.sectionLabel}>Carte hors-ligne</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>Cache offline</Text>
                <Text style={styles.rowSub}>Utiliser carte + cours d&apos;eau sans réseau</Text>
              </View>
              <Switch
                value={settings.offlineMapEnabled}
                onValueChange={(v) => updateSettings({ offlineMapEnabled: v })}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={settings.offlineMapEnabled ? theme.accent : theme.textSecondary}
              />
            </View>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.row} onPress={handleDownloadZone} disabled={downloadingZone}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>
                  {downloadingZone ? "Téléchargement..." : "Télécharger ma zone (~25 km)"}
                </Text>
                <Text style={styles.rowSub}>
                  {downloadingZone ? zoneProgress : "Cours d'eau + tuiles carte autour de votre position"}
                </Text>
              </View>
              {!downloadingZone && <Text style={styles.rowArrow}>↓</Text>}
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.row} onPress={handleClearCache}>
              <View style={styles.rowLeft}>
                <Text style={[styles.rowLabel, { color: theme.danger }]}>Vider le cache</Text>
                <Text style={styles.rowSub}>Supprimer cours d&apos;eau, tuiles, itinéraires</Text>
              </View>
              <Text style={[styles.rowArrow, { color: theme.danger }]}>×</Text>
            </TouchableOpacity>
          </View>

          {/* === DONNÉES === */}
          <Text style={styles.sectionLabel}>Données</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={handleExport} disabled={exporting}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>{exporting ? "Export en cours..." : "Exporter au format CSV"}</Text>
                <Text style={styles.rowSub}>Partager les données turbines + batteries</Text>
              </View>
              <Text style={styles.rowArrow}>↗</Text>
            </TouchableOpacity>
          </View>

          {/* === TURBINES === */}
          <Text style={styles.sectionLabel}>Turbines connectées</Text>
          {turbines.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTxt}>Aucune turbine connectée</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {turbines.map((t, i) => (
                <View key={t.id}>
                  <View style={styles.row}>
                    <View style={styles.rowLeft}>
                      <View style={styles.turbineRow}>
                        <View style={styles.turbineDot} />
                        <Text style={styles.rowLabel}>{t.name}</Text>
                      </View>
                      <Text style={styles.rowSub}>
                        {t.batteries.length} batterie{t.batteries.length > 1 ? "s" : ""} ·{" "}
                        {Math.round(t.power || 0)}W · {(t.energy || 0).toFixed(1)} Wh
                      </Text>
                    </View>
                    <Text style={[styles.statusBadge, { color: theme.success }]}>{t.status}</Text>
                  </View>
                  {i < turbines.length - 1 && <View style={styles.separator} />}
                </View>
              ))}
            </View>
          )}

          {/* === À PROPOS === */}
          <Text style={styles.sectionLabel}>Application</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={onOpenAbout}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>À propos d&apos;HydroTech</Text>
                <Text style={styles.rowSub}>Version, légende, sources</Text>
              </View>
              <Text style={styles.rowArrow}>→</Text>
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.row} onPress={() => { onClose(); onReplayOnboarding(); }}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>Revoir le tutoriel</Text>
                <Text style={styles.rowSub}>5 écrans d&apos;introduction</Text>
              </View>
              <Text style={styles.rowArrow}>→</Text>
            </TouchableOpacity>
            <View style={styles.separator} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Version</Text>
              <Text style={styles.rowValue}>1.0.0</Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        <Toast message={toastMessage} visible={toastVisible} onHide={() => setToastVisible(false)} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 0.5, borderColor: theme.border, gap: 12 },
  backBtn: { padding: 4 },
  backTxt: { fontSize: 14, color: theme.accent },
  title: { fontSize: 18, fontWeight: "500", color: theme.textPrimary },
  scroll: { flex: 1, padding: 16 },
  sectionLabel: { fontSize: 9, letterSpacing: 2, color: theme.textSecondary, textTransform: "uppercase", marginTop: 20, marginBottom: 8 },
  card: { backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 14, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  rowLeft: { flex: 1, marginRight: 12 },
  rowLabel: { fontSize: 14, color: theme.textPrimary },
  rowSub: { fontSize: 11, color: theme.textSecondary, marginTop: 2 },
  rowValue: { fontSize: 13, color: theme.textSecondary },
  rowArrow: { fontSize: 16, color: theme.textSecondary },
  separator: { height: 0.5, backgroundColor: theme.border, marginHorizontal: 14 },
  rateRow: { flexDirection: "row", gap: 6 },
  rateBtn: { backgroundColor: theme.bg, borderWidth: 0.5, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  rateBtnActive: { borderColor: theme.primary, backgroundColor: "#0f2040" },
  rateTxt: { fontSize: 12, color: theme.textSecondary },
  rateTxtActive: { color: theme.accent },
  turbineRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  turbineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.success },
  statusBadge: { fontSize: 11 },
  emptyCard: { backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 14, padding: 20, alignItems: "center" },
  emptyTxt: { fontSize: 13, color: theme.textSecondary },
  statRow: { flexDirection: "row", padding: 14, gap: 8 },
  statItem: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 22, fontWeight: "500", color: theme.textPrimary },
  statUnit: { fontSize: 11, color: theme.textSecondary, fontWeight: "400" },
  statLabel: { fontSize: 9, letterSpacing: 1.5, color: theme.textSecondary, textTransform: "uppercase", marginTop: 2 },
});
