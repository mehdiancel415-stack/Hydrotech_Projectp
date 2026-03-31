import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { BLE_CONFIG, parseBLEData, TurbineData } from './bleConfig';

const manager = new BleManager();

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
  const hasPermission = await requestBLEPermissions();
  if (!hasPermission) {
    onError('Permissions Bluetooth refusées');
    return;
  }

  manager.startDeviceScan(null, null, (error, device) => {
    if (error) {
      onError(error.message);
      return;
    }
    if (
      device &&
      device.name &&
      device.name.startsWith(BLE_CONFIG.DEVICE_NAME_PREFIX)
    ) {
      onFound(device);
    }
  });

  setTimeout(() => {
    manager.stopDeviceScan();
  }, timeoutMs);
}

export function stopScan() {
  manager.stopDeviceScan();
}

export async function connectToTurbine(
  device: Device,
  onData: (data: TurbineData) => void,
  onDisconnect: () => void,
  onError: (error: string) => void
): Promise<Device | null> {
  try {
    const connected = await device.connect();
    await connected.discoverAllServicesAndCharacteristics();

    connected.onDisconnected(() => {
      onDisconnect();
    });

    connected.monitorCharacteristicForService(
      BLE_CONFIG.SERVICE_UUID,
      BLE_CONFIG.CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) {
          onError(error.message);
          return;
        }
        if (characteristic?.value) {
          const raw = Buffer.from(characteristic.value, 'base64').toString('utf-8');
          const data = parseBLEData(raw);
          if (data) onData(data);
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

export function destroyBLEManager() {
  manager.destroy();
}