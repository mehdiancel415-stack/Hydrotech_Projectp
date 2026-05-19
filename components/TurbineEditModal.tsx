import { Modal, View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from "react-native";
import { useState, useEffect } from "react";
import { theme } from "../constants/theme";

type Props = {
  visible: boolean;
  turbine: { id: number | string; name: string; status: string; energy: number; power: number; batteries: any[] } | null;
  onClose: () => void;
  onRename: (newName: string) => void;
  onToggleStatus: () => void;
  onDelete: () => void;
};

export default function TurbineEditModal({ visible, turbine, onClose, onRename, onToggleStatus, onDelete }: Props) {
  const [name, setName] = useState("");

  useEffect(() => { if (turbine) setName(turbine.name); }, [turbine]);

  if (!turbine) return null;

  const handleDelete = () => {
    Alert.alert(
      "Supprimer la turbine",
      `Voulez-vous vraiment supprimer "${turbine.name}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => { onDelete(); onClose(); } },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Modifier la turbine</Text>

          <Text style={styles.sectionLabel}>Nom</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nom de la turbine"
            placeholderTextColor={theme.textSecondary}
          />

          <Text style={styles.sectionLabel}>Statut</Text>
          <TouchableOpacity style={styles.statusBtn} onPress={onToggleStatus}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: turbine.status === "En marche" ? theme.success : theme.warning },
              ]}
            />
            <Text style={styles.statusTxt}>{turbine.status}</Text>
            <Text style={styles.toggleTxt}>Changer</Text>
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>Statistiques</Text>
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Puissance actuelle</Text>
              <Text style={styles.statVal}>{Math.round(turbine.power || 0)} W</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Énergie produite</Text>
              <Text style={styles.statVal}>{(turbine.energy || 0).toFixed(1)} Wh</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Batteries connectées</Text>
              <Text style={styles.statVal}>{turbine.batteries.length}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteTxt}>Supprimer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelTxt}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => {
                if (name.trim() && name.trim() !== turbine.name) onRename(name.trim());
                onClose();
              }}
            >
              <Text style={styles.saveTxt}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 20 },
  sheet: { backgroundColor: theme.bg, borderRadius: 16, borderWidth: 0.5, borderColor: theme.primary, padding: 20, gap: 8 },
  title: { fontSize: 16, fontWeight: "500", color: theme.textPrimary, textAlign: "center", marginBottom: 8 },
  sectionLabel: { fontSize: 9, letterSpacing: 1.5, color: theme.textSecondary, textTransform: "uppercase", marginTop: 8 },
  input: { backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.primary, borderRadius: 10, padding: 12, color: theme.textPrimary, fontSize: 14 },
  statusBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 10, padding: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusTxt: { flex: 1, fontSize: 13, color: theme.textPrimary },
  toggleTxt: { fontSize: 11, color: theme.accent },
  statsCard: { backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 10, padding: 12, gap: 6 },
  statRow: { flexDirection: "row", justifyContent: "space-between" },
  statLabel: { fontSize: 12, color: theme.textSecondary },
  statVal: { fontSize: 12, color: theme.textPrimary, fontWeight: "500" },
  row: { flexDirection: "row", gap: 8, marginTop: 12 },
  cancelBtn: { flex: 1, backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 10, padding: 12, alignItems: "center" },
  cancelTxt: { fontSize: 13, color: theme.textSecondary },
  saveBtn: { flex: 1, backgroundColor: "#0f2040", borderWidth: 0.5, borderColor: theme.primary, borderRadius: 10, padding: 12, alignItems: "center" },
  saveTxt: { fontSize: 13, color: theme.accent, fontWeight: "500" },
  deleteBtn: { flex: 1, backgroundColor: "#1a0808", borderWidth: 0.5, borderColor: theme.danger, borderRadius: 10, padding: 12, alignItems: "center" },
  deleteTxt: { fontSize: 13, color: theme.danger },
});
