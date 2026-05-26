import { PermissionsAndroid, Platform } from 'react-native';
import type { BleManager as BleManagerType, Device } from 'react-native-ble-plx';
import { BLE_CONFIG, parseBLEData, TurbineData } from './bleConfig';

let manager: BleManagerType | null = null;

function getManager(): BleManagerType | null {
  if (manager) return manager;
  const { BleManager } = require('react-native-ble-plx');
  manager = new BleManager();
  return manager;
}

function decodeBase64Utf8(b64: string): string {
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8').decode(bytes);
    }
    return binary;
  } catch {
    return '';
  }
}

export async function requestBLEPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const grants = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);

    console.log('[BLE] Permissions résultat:', JSON.stringify(grants));

    const denied = Object.entries(grants)
      .filter(([_, v]) => v !== PermissionsAndroid.RESULTS.GRANTED)
      .map(([k]) => k);

    if (denied.length > 0) {
      console.warn('[BLE] Permissions refusées:', denied);
      // Sur Android < 12, BLUETOOTH_SCAN et BLUETOOTH_CONNECT n'existent pas
      // Seule ACCESS_FINE_LOCATION est critique
      const criticalDenied = denied.filter(
        (p) => p === 'android.permission.ACCESS_FINE_LOCATION'
      );
      return criticalDenied.length === 0;
    }

    return true;
  }
  return true;
}

export async function scanForTurbines(
  onFound: (device: Device) => void,
  onError: (error: string) => void,
  timeoutMs: number = 15000
): Promise<void> {
  const m = getManager();
  if (!m) return;

  const hasPermission = await requestBLEPermissions();
  if (!hasPermission) {
    onError('Permission localisation refusée — obligatoire pour le scan BLE');
    return;
  }

  m.startDeviceScan(null, null, (error, device) => {
    if (error) {
      console.error('[BLE] Erreur scan:', error.message);
      onError(error.message);
      return;
    }
    if (device?.name?.startsWith(BLE_CONFIG.DEVICE_NAME_PREFIX)) {
      console.log('[BLE] Appareil trouvé:', device.name, device.id);
      onFound(device);
    }
  });

  setTimeout(() => {
    console.log('[BLE] Scan terminé (timeout)');
    getManager()?.stopDeviceScan();
  }, timeoutMs);
}

export async function connectToTurbine(
  device: Device,
  onData: (data: TurbineData) => void,
  onDisconnect: () => void,
  onError: (error: string) => void
): Promise<Device | null> {
  const m = getManager();
  if (!m) return null;

  try {
    console.log('[BLE] Connexion à', device.name, device.id);
    const connected = await device.connect();

    try {
      await connected.requestMTU(247);
      console.log('[BLE] MTU négocié');
    } catch (e) {
      console.warn('[BLE] Échec négociation MTU', e);
    }

    await connected.discoverAllServicesAndCharacteristics();
    console.log('[BLE] Services découverts');

    connected.onDisconnected(() => {
      console.log('[BLE] Déconnecté');
      onDisconnect();
    });

    connected.monitorCharacteristicForService(
      BLE_CONFIG.SERVICE_UUID,
      BLE_CONFIG.CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) {
          console.error('[BLE] Erreur monitor:', error.message);
          onError(error.message);
          return;
        }
        if (characteristic?.value) {
          const raw = decodeBase64Utf8(characteristic.value);
          console.log('[BLE] Données brutes:', raw);
          const data = parseBLEData(raw);
          if (data) {
            console.log('[BLE] Données parsées:', JSON.stringify(data));
            onData(data);
          } else {
            console.warn('[BLE] Parsing échoué pour:', raw);
          }
        }
      }
    );

    return connected;
  } catch (e: any) {
    console.error('[BLE] Erreur connexion:', e.message);
    onError(e.message || 'Erreur de connexion');
    return null;
  }
}

export async function disconnectTurbine(device: Device): Promise<void> {
  try {
    await device.cancelConnection();
    console.log('[BLE] Déconnexion manuelle OK');
  } catch (e) {
    console.warn('[BLE] Erreur déconnexion:', e);
  }
}
