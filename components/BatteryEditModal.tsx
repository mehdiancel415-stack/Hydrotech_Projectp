import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useState, useEffect, useRef } from "react";
import { PanResponder } from "react-native";
import { theme } from "../constants/theme";

type Props = {
  visible: boolean;
  battery: { id: number; name: string; type: string; capacity: number; percentage: number } | null;
  onClose: () => void;
  onSave: (newPct: number) => void;
  onDelete?: () => void;
};

export default function BatteryEditModal({ visible, battery, onClose, onSave, onDelete }: Props) {
  const [pct, setPct] = useState(50);
  const trackWidth = useRef(280);
  const containerRef = useRef<View>(null);

  useEffect(() => {
    if (battery) setPct(battery.percentage);
    else if (!battery && visible) onClose();
  }, [battery]);

  const setPercentageFromTouch = (locationX: number) => {
    const w = trackWidth.current || 280;
    const clamped = Math.max(0, Math.min(w, locationX));
    setPct(Math.round((clamped / w) * 100));
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => setPercentageFromTouch(evt.nativeEvent.locationX),
    onPanResponderMove: (evt) => setPercentageFromTouch(evt.nativeEvent.locationX),
  });

  if (!battery) return null;

  const color =
    pct > 60 ? theme.accent : pct > 30 ? theme.warning : theme.danger;

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Modifier la charge</Text>
          <Text style={styles.sub}>{battery.name} · {battery.type} · {battery.capacity} Ah</Text>

          <View style={styles.bigPctWrap}>
            <Text style={[styles.bigPct, { color }]}>{pct}%</Text>
          </View>

          <View
            ref={containerRef}
            style={styles.trackContainer}
            onLayout={(e) => { trackWidth.current = e.nativeEvent.layout.width; }}
            {...panResponder.panHandlers}
          >
            <View style={styles.trackBg}>
              <View style={[styles.trackFill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
            <View
              style={[
                styles.thumb,
                { left: `${pct}%`, backgroundColor: color },
              ]}
            />
          </View>

          <View style={styles.quickRow}>
            {[0, 25, 50, 75, 100].map((v) => (
              <TouchableOpacity key={v} style={styles.quickBtn} onPress={() => setPct(v)}>
                <Text style={styles.quickTxt}>{v}%</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            {onDelete && (
              <TouchableOpacity style={styles.deleteBtn} onPress={() => { onDelete(); onClose(); }}>
                <Text style={styles.deleteTxt}>Supprimer</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelTxt}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={() => { onSave(pct); onClose(); }}>
              <Text style={styles.saveTxt}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 20 },
  sheet: { backgroundColor: theme.bg, borderRadius: 16, borderWidth: 0.5, borderColor: theme.primary, padding: 20, gap: 12 },
  title: { fontSize: 16, fontWeight: "500", color: theme.textPrimary, textAlign: "center" },
  sub: { fontSize: 11, color: theme.textSecondary, textAlign: "center" },
  bigPctWrap: { alignItems: "center", marginVertical: 8 },
  bigPct: { fontSize: 48, fontWeight: "300" },
  trackContainer: { height: 36, justifyContent: "center", marginVertical: 8 },
  trackBg: { height: 6, backgroundColor: theme.bgCard, borderRadius: 3, overflow: "hidden" },
  trackFill: { height: "100%", borderRadius: 3 },
  thumb: {
    position: "absolute", width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: "#fff",
    marginLeft: -11, top: 7,
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  quickRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 4 },
  quickBtn: {
    backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  quickTxt: { fontSize: 11, color: theme.textSecondary },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 10, padding: 12, alignItems: "center" },
  cancelTxt: { fontSize: 13, color: theme.textSecondary },
  saveBtn: { flex: 1, backgroundColor: "#0f2040", borderWidth: 0.5, borderColor: theme.primary, borderRadius: 10, padding: 12, alignItems: "center" },
  saveTxt: { fontSize: 13, color: theme.accent, fontWeight: "500" },
  deleteBtn: { flex: 1, backgroundColor: "#1a0808", borderWidth: 0.5, borderColor: theme.danger, borderRadius: 10, padding: 12, alignItems: "center" },
  deleteTxt: { fontSize: 13, color: theme.danger },
});
