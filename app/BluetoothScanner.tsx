import { useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Device } from 'react-native-ble-plx';
import { connectToTurbine, scanForTurbines, stopScan } from '../BLEManager';
import { TurbineData } from '../bleConfig';
import { theme } from '../constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConnect: (device: { id: string; name: string }, data: TurbineData) => void;
};

type ScanState = 'idle' | 'scanning' | 'found' | 'naming' | 'connecting' | 'connected' | 'error';

export default function BluetoothScanner({ visible, onClose, onConnect }: Props) {
  const [state, setState] = useState<ScanState>('idle');
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [turbineName, setTurbineName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastData, setLastData] = useState<TurbineData | null>(null);

  const reset = () => {
    setState('idle');
    setDevices([]);
    setSelectedDevice(null);
    setTurbineName('');
    setErrorMsg('');
    setLastData(null);
  };

  const handleClose = () => {
    stopScan();
    reset();
    onClose();
  };

  const startScan = () => {
    setState('scanning');
    setDevices([]);

    scanForTurbines(
      (device) => {
        setDevices(prev => {
          const exists = prev.find(d => d.id === device.id);
          if (exists) return prev;
          const updated = [...prev, device];
          if (updated.length > 0) setState('found');
          return updated;
        });
      },
      (error) => {
        setErrorMsg(error);
        setState('error');
      },
      15000
    );

    setTimeout(() => {
      setState(prev => prev === 'scanning' ? 'error' : prev);
      setErrorMsg(prev => prev || 'Aucune turbine trouvée — vérifiez que l\'ESP32 est allumé');
    }, 16000);
  };

  const selectDevice = (device: Device) => {
    stopScan();
    setSelectedDevice(device);
    setTurbineName(device.name || 'HydroTech');
    setState('naming');
  };

  const confirmConnect = async () => {
    if (!selectedDevice) return;
    Keyboard.dismiss();
    setState('connecting');

    const connected = await connectToTurbine(
      selectedDevice,
      (data) => setLastData(data),
      () => {
        reset();
        onClose();
      },
      (error) => {
        setErrorMsg(error);
        setState('error');
      }
    );

    if (connected) {
      setState('connected');
      setTimeout(() => {
        onConnect(
          {
            id: selectedDevice.id,
            name: turbineName.trim() || selectedDevice.name || 'HydroTech',
          },
          lastData || { voltage: 0, current: 0, power: 0 }
        );
        reset();
        onClose();
      }, 800);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={Keyboard.dismiss}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>

            <View style={styles.header}>
              <View style={styles.handle} />
              <Text style={styles.title}>Connecter une turbine</Text>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* IDLE */}
              {state === 'idle' && (
                <View style={styles.stateContainer}>
                  <View style={styles.iconCircle}>
                    <Text style={styles.iconTxt}>📡</Text>
                  </View>
                  <Text style={styles.stateTitle}>Prêt à scanner</Text>
                  <Text style={styles.stateSub}>
                    Assurez-vous que votre turbine HydroTech est allumée et proche
                  </Text>
                  <TouchableOpacity style={styles.primaryBtn} onPress={startScan}>
                    <Text style={styles.primaryBtnTxt}>Scanner les turbines</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                    <Text style={styles.cancelTxt}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* SCANNING */}
              {state === 'scanning' && (
                <View style={styles.stateContainer}>
                  <View style={styles.iconCircle}>
                    <ActivityIndicator size="large" color={theme.accent} />
                  </View>
                  <Text style={styles.stateTitle}>Recherche en cours...</Text>
                  <Text style={styles.stateSub}>
                    Recherche des appareils HydroTech à proximité
                  </Text>
                  {devices.map(d => (
                    <View key={d.id} style={styles.deviceFound}>
                      <View style={styles.deviceDot} />
                      <Text style={styles.deviceName}>{d.name}</Text>
                      <Text style={styles.deviceSub}>Détecté</Text>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                    <Text style={styles.cancelTxt}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* FOUND */}
              {state === 'found' && (
                <View style={styles.stateContainer}>
                  <Text style={styles.sectionLabel}>Turbines détectées</Text>
                  {devices.map(d => (
                    <TouchableOpacity
                      key={d.id}
                      style={styles.deviceCard}
                      onPress={() => selectDevice(d)}
                    >
                      <View style={styles.deviceCardLeft}>
                        <View style={styles.deviceDot} />
                        <View>
                          <Text style={styles.deviceName}>{d.name}</Text>
                          <Text style={styles.deviceSub}>
                            HydroTech · BLE · {d.rssi ? `${d.rssi} dBm` : ''}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.connectTxt}>Connecter →</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                    <Text style={styles.cancelTxt}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* NAMING */}
              {state === 'naming' && (
                <View style={styles.stateContainer}>
                  <View style={styles.iconCircle}>
                    <Text style={styles.iconTxt}>✏️</Text>
                  </View>
                  <Text style={styles.stateTitle}>Nommer la turbine</Text>
                  <Text style={styles.stateSub}>
                    Donnez un nom pour retrouver facilement cette turbine
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={selectedDevice?.name || 'HydroTech'}
                    placeholderTextColor={theme.textSecondary}
                    value={turbineName}
                    onChangeText={setTurbineName}
                    returnKeyType="done"
                    onSubmitEditing={confirmConnect}
                    autoFocus={true}
                  />
                  <TouchableOpacity style={styles.primaryBtn} onPress={confirmConnect}>
                    <Text style={styles.primaryBtnTxt}>
                      Connecter "{turbineName || selectedDevice?.name}"
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                    <Text style={styles.cancelTxt}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* CONNECTING */}
              {state === 'connecting' && (
                <View style={styles.stateContainer}>
                  <View style={styles.iconCircle}>
                    <ActivityIndicator size="large" color={theme.accent} />
                  </View>
                  <Text style={styles.stateTitle}>Connexion en cours...</Text>
                  <Text style={styles.stateSub}>
                    Établissement de la connexion BLE avec {selectedDevice?.name}
                  </Text>
                </View>
              )}

              {/* CONNECTED */}
              {state === 'connected' && (
                <View style={styles.stateContainer}>
                  <View style={[styles.iconCircle, { borderColor: theme.success }]}>
                    <Text style={styles.iconTxt}>✓</Text>
                  </View>
                  <Text style={[styles.stateTitle, { color: theme.success }]}>
                    Connecté !
                  </Text>
                  <Text style={styles.stateSub}>Chargement de l'interface...</Text>
                </View>
              )}

              {/* ERROR */}
              {state === 'error' && (
                <View style={styles.stateContainer}>
                  <View style={[styles.iconCircle, { borderColor: theme.danger }]}>
                    <Text style={styles.iconTxt}>⚠️</Text>
                  </View>
                  <Text style={[styles.stateTitle, { color: theme.danger }]}>
                    Erreur
                  </Text>
                  <Text style={styles.stateSub}>{errorMsg}</Text>
                  <TouchableOpacity style={styles.primaryBtn} onPress={startScan}>
                    <Text style={styles.primaryBtnTxt}>Réessayer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                    <Text style={styles.cancelTxt}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              )}

            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: theme.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 0.5, borderColor: theme.primary, paddingBottom: 30, maxHeight: '90%' },
  header: { alignItems: 'center', padding: 16, gap: 8 },
  handle: { width: 36, height: 4, backgroundColor: theme.border, borderRadius: 2 },
  title: { fontSize: 16, fontWeight: '500', color: theme.textPrimary },
  stateContainer: { padding: 16, alignItems: 'center', gap: 12 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 1.5, borderColor: theme.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  iconTxt: { fontSize: 32 },
  stateTitle: { fontSize: 16, fontWeight: '500', color: theme.textPrimary, textAlign: 'center' },
  stateSub: { fontSize: 12, color: theme.textSecondary, textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },
  sectionLabel: { fontSize: 9, letterSpacing: 2, color: theme.textSecondary, textTransform: 'uppercase', alignSelf: 'flex-start', marginBottom: 4 },
  deviceFound: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 10, padding: 10, width: '100%' },
  deviceCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.primary, borderRadius: 12, padding: 14, width: '100%' },
  deviceCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deviceDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.accent },
  deviceName: { fontSize: 14, color: theme.textPrimary, fontWeight: '500' },
  deviceSub: { fontSize: 11, color: theme.textSecondary, marginTop: 2 },
  connectTxt: { fontSize: 12, color: theme.accent },
  input: { backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.primary, borderRadius: 10, padding: 12, color: theme.textPrimary, fontSize: 14, width: '100%' },
  primaryBtn: { backgroundColor: '#0f2040', borderWidth: 0.5, borderColor: theme.primary, borderRadius: 12, padding: 14, alignItems: 'center', width: '100%' },
  primaryBtnTxt: { fontSize: 14, color: theme.accent, fontWeight: '500' },
  cancelBtn: { backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.border, borderRadius: 12, padding: 12, alignItems: 'center', width: '100%' },
  cancelTxt: { fontSize: 13, color: theme.textSecondary },
});