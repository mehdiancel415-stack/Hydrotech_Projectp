import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal } from 'react-native';
import { useState } from 'react';
import { theme } from '../constants/theme';

type BatteryData = {
  name: string;
  type: string;
  capacity: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (battery: BatteryData) => void;
  detectedVoltage?: number;
};

const BATTERY_TYPES = [
  { label: 'LiFePO4', description: 'Lithium Fer Phosphate — idéal camping', voltMin: 10.0, voltMax: 13.6 },
  { label: 'Li-ion', description: 'Lithium-ion — léger et compact', voltMin: 10.0, voltMax: 16.8 },
  { label: 'Plomb', description: 'Plomb-acide — robuste et économique', voltMin: 11.8, voltMax: 12.7 },
];

const CAPACITIES = ['5', '10', '12', '15', '20', '30', '50', '100'];

export default function BatteryConfig({ visible, onClose, onSave, detectedVoltage }: Props) {
  const [selectedType, setSelectedType] = useState('LiFePO4');
  const [selectedCapacity, setSelectedCapacity] = useState('20');
  const [customCapacity, setCustomCapacity] = useState('');
  const [batteryName, setBatteryName] = useState('');

  const getInitialPct = () => {
    if (!detectedVoltage) return null;
    const type = BATTERY_TYPES.find(t => t.label === selectedType);
    if (!type) return null;
    const pct = Math.round((detectedVoltage - type.voltMin) / (type.voltMax - type.voltMin) * 100);
    return Math.min(100, Math.max(0, pct));
  };

  const handleSave = () => {
    const capacity = customCapacity ? parseFloat(customCapacity) : parseFloat(selectedCapacity);
    onSave({
      name: batteryName || `Batterie ${Date.now()}`,
      type: selectedType,
      capacity,
    });
    onClose();
  };

  const initialPct = getInitialPct();

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>Nouvelle batterie</Text>
            {detectedVoltage && (
              <View style={styles.voltageBadge}>
                <Text style={styles.voltageText}>⚡ {detectedVoltage.toFixed(1)}V détectée</Text>
              </View>
            )}
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

            {/* NOM */}
            <Text style={styles.sectionLabel}>Nom</Text>
            <TextInput
              style={styles.input}
              placeholder="ex: Batterie principale"
              placeholderTextColor={theme.textSecondary}
              value={batteryName}
              onChangeText={setBatteryName}
            />

            {/* TYPE */}
            <Text style={styles.sectionLabel}>Type de batterie</Text>
            {BATTERY_TYPES.map((t) => (
              <TouchableOpacity
                key={t.label}
                style={[styles.typeCard, selectedType === t.label && styles.typeCardActive]}
                onPress={() => setSelectedType(t.label)}
              >
                <View style={styles.typeLeft}>
                  <Text style={[styles.typeLabel, selectedType === t.label && styles.typeLabelActive]}>
                    {t.label}
                  </Text>
                  <Text style={styles.typeDesc}>{t.description}</Text>
                </View>
                <View style={[styles.radio, selectedType === t.label && styles.radioActive]}>
                  {selectedType === t.label && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}

            {/* CAPACITÉ */}
            <Text style={styles.sectionLabel}>Capacité (Ah)</Text>
            <View style={styles.capacityGrid}>
              {CAPACITIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.capacityBtn, selectedCapacity === c && !customCapacity && styles.capacityBtnActive]}
                  onPress={() => { setSelectedCapacity(c); setCustomCapacity(''); }}
                >
                  <Text style={[styles.capacityTxt, selectedCapacity === c && !customCapacity && styles.capacityTxtActive]}>
                    {c}Ah
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.orTxt}>ou saisir manuellement</Text>
            <TextInput
              style={styles.input}
              placeholder="ex: 25"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              value={customCapacity}
              onChangeText={setCustomCapacity}
            />

            {/* APERÇU */}
            {initialPct !== null && (
              <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>État initial détecté</Text>
                <Text style={styles.previewPct}>{initialPct}%</Text>
                <Text style={styles.previewSub}>
                  basé sur {detectedVoltage?.toFixed(1)}V · {selectedType}
                </Text>
              </View>
            )}

          </ScrollView>

          {/* BOUTONS */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelTxt}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveTxt}>Ajouter la batterie</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: theme.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 0.5, borderColor: theme.primary, maxHeight: '90%' },
  header: { alignItems: 'center', padding: 16, gap: 8 },
  handle: { width: 36, height: 4, backgroundColor: theme.border, borderRadius: 2 },
  title: { fontSize: 16, fontWeight: '500', color: theme.textPrimary },
  voltageBadge: { backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.primary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  voltageText: { fontSize: 12, color: theme.accent },
  scroll: { paddingHorizontal: 16 },
  sectionLabel: { fontSize: 9, letterSpacing: 2, color: theme.textSecondary, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 },
  input: { backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 10, padding: 12, color: theme.textPrimary, fontSize: 14, marginBottom: 8 },
  typeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  typeCardActive: { borderColor: theme.primary },
  typeLeft: { flex: 1 },
  typeLabel: { fontSize: 14, color: theme.textPrimary, fontWeight: '500' },
  typeLabelActive: { color: theme.accent },
  typeDesc: { fontSize: 11, color: theme.textSecondary, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: theme.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.accent },
  capacityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  capacityBtn: { backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  capacityBtnActive: { borderColor: theme.primary, backgroundColor: '#0f2040' },
  capacityTxt: { fontSize: 13, color: theme.textSecondary },
  capacityTxtActive: { color: theme.accent },
  orTxt: { fontSize: 11, color: theme.textSecondary, textAlign: 'center', marginBottom: 8 },
  previewCard: { backgroundColor: '#0f2040', borderWidth: 0.5, borderColor: theme.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  previewLabel: { fontSize: 10, color: theme.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  previewPct: { fontSize: 36, fontWeight: '500', color: theme.accent, marginVertical: 4 },
  previewSub: { fontSize: 11, color: theme.textSecondary },
  footer: { flexDirection: 'row', gap: 10, padding: 16 },
  cancelBtn: { flex: 1, backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelTxt: { fontSize: 14, color: theme.textSecondary },
  saveBtn: { flex: 2, backgroundColor: '#0f2040', borderWidth: 0.5, borderColor: theme.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  saveTxt: { fontSize: 14, color: theme.accent, fontWeight: '500' },
});