import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
} from "react-native";
import { useState } from "react";
import { theme } from "../constants/theme";
import Toast from "./Toast";

type Props = {
  visible: boolean;
  onClose: () => void;
  turbines: any[];
  onUpdateBatteries: (turbineId: number, batteries: any[]) => void;
  onTestToast?: () => void;
};

export default function SettingsScreen({
  visible,
  onClose,
  turbines,
  onUpdateBatteries,
  onTestToast,
}: Props) {
  const [refreshRate, setRefreshRate] = useState(10);
  const [bleAuto, setBleAuto] = useState(true);
  const [offlineMap, setOfflineMap] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
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
          <Text style={styles.sectionLabel}>Connexion</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>Reconnexion automatique</Text>
                <Text style={styles.rowSub}>
                  Se reconnecter si signal perdu
                </Text>
              </View>
              <Switch
                value={bleAuto}
                onValueChange={setBleAuto}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={bleAuto ? theme.accent : theme.textSecondary}
              />
            </View>
            <View style={styles.separator} />
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>Intervalle de mesure</Text>
                <Text style={styles.rowSub}>Rafraîchissement des données</Text>
              </View>
              <View style={styles.rateRow}>
                {[5, 10, 15, 30].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.rateBtn,
                      refreshRate === r && styles.rateBtnActive,
                    ]}
                    onPress={() => setRefreshRate(r)}
                  >
                    <Text
                      style={[
                        styles.rateTxt,
                        refreshRate === r && styles.rateTxtActive,
                      ]}
                    >
                      {r}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Carte</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>Cache offline</Text>
                <Text style={styles.rowSub}>Utiliser la carte sans réseau</Text>
              </View>
              <Switch
                value={offlineMap}
                onValueChange={setOfflineMap}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={offlineMap ? theme.accent : theme.textSecondary}
              />
            </View>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>Mettre à jour la carte</Text>
                <Text style={styles.rowSub}>
                  Télécharger les dernières données
                </Text>
              </View>
              <Text style={styles.rowArrow}>→</Text>
            </TouchableOpacity>
          </View>

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
                        {t.batteries.length} batterie
                        {t.batteries.length > 1 ? "s" : ""} · {t.power}W · BLE
                      </Text>
                    </View>
                    <Text
                      style={[styles.statusBadge, { color: theme.success }]}
                    >
                      En marche
                    </Text>
                  </View>
                  {i < turbines.length - 1 && <View style={styles.separator} />}
                </View>
              ))}
            </View>
          )}

          <Text style={styles.sectionLabel}>Application</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Version</Text>
              <Text style={styles.rowValue}>1.0.0</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Consommation estimée</Text>
              <Text style={styles.rowValue}>470 mW</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Mode</Text>
              <Text style={styles.rowValue}>Sombre · BLE</Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        <Toast
          message={toastMessage}
          visible={toastVisible}
          onHide={() => setToastVisible(false)}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderColor: theme.border,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backTxt: { fontSize: 14, color: theme.accent },
  title: { fontSize: 18, fontWeight: "500", color: theme.textPrimary },
  scroll: { flex: 1, padding: 16 },
  sectionLabel: {
    fontSize: 9,
    letterSpacing: 2,
    color: theme.textSecondary,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 8,
  },
  card: {
    backgroundColor: theme.bgCard,
    borderWidth: 0.5,
    borderColor: theme.border,
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  rowLeft: { flex: 1, marginRight: 12 },
  rowLabel: { fontSize: 14, color: theme.textPrimary },
  rowSub: { fontSize: 11, color: theme.textSecondary, marginTop: 2 },
  rowValue: { fontSize: 13, color: theme.textSecondary },
  rowArrow: { fontSize: 16, color: theme.textSecondary },
  separator: {
    height: 0.5,
    backgroundColor: theme.border,
    marginHorizontal: 14,
  },
  rateRow: { flexDirection: "row", gap: 6 },
  rateBtn: {
    backgroundColor: theme.bg,
    borderWidth: 0.5,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rateBtnActive: { borderColor: theme.primary, backgroundColor: "#0f2040" },
  rateTxt: { fontSize: 12, color: theme.textSecondary },
  rateTxtActive: { color: theme.accent },
  turbineRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  turbineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.success,
  },
  statusBadge: { fontSize: 11 },
  emptyCard: {
    backgroundColor: theme.bgCard,
    borderWidth: 0.5,
    borderColor: theme.border,
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
  },
  emptyTxt: { fontSize: 13, color: theme.textSecondary },
});
