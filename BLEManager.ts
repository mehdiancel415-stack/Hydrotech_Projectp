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
    return Object.values(grants).every(
      (g) => g === PermissionsAndroid.RESULTS.GRANTED
    );
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
    onError('Permissions Bluetooth refusées');
    return;
  }

  m.startDeviceScan(null, null, (error, device) => {
    if (error) {
      onError(error.message);
      return;
    }
    if (device?.name?.startsWith(BLE_CONFIG.DEVICE_NAME_PREFIX)) {
      onFound(device);
    }
  });

  setTimeout(() => {
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
    const connected = await device.connect();

    try {
      await connected.requestMTU(247);
    } catch (e) {
      console.warn('[BLE] Échec négociation MTU', e);
    }

    await connected.discoverAllServicesAndCharacteristics();

    connected.onDisconnected(() => onDisconnect());

    connected.monitorCharacteristicForService(
      BLE_CONFIG.SERVICE_UUID,
      BLE_CONFIG.CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) {
          onError(error.message);
          return;
        }
        if (characteristic?.value) {
          const raw = decodeBase64Utf8(characteristic.value);
          const data = parseBLEData(raw);
          if (data) {
            console.log('[BLE] Données reçues:', data); // ← utile pour debug
            onData(data);
          }
        }
      }
    );

    return connected;
  } catch (e: any) {
    onError(e.message || 'Erreur de connexion');
    return null;
  }
}

export async function disconnectTurbine(device: Device): Promise<void> {
  try {
    await device.cancelConnection();
  } catch (e) {}
}
