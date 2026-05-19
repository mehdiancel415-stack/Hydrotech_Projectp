import { PermissionsAndroid, Platform } from 'react-native';
import type { BleManager as BleManagerType, Device } from 'react-native-ble-plx';
import { BLE_CONFIG, parseBLEData, TurbineData } from './bleConfig';

/**
 * On charge le module BLE de façon "paresseuse" pour que l'app puisse démarrer
 * dans Expo Go (où le module natif n'existe pas) sans crash. Le scan échouera
 * proprement avec un message clair tant qu'on n'utilise pas un dev build.
 */
let manager: BleManagerType | null = null;
let bleUnavailable = false;

function getManager(): BleManagerType | null {
  if (bleUnavailable) return null;
  if (manager) return manager;
  try {
    const { BleManager } = require('react-native-ble-plx');
    manager = new BleManager();
    console.log('[BLE] BleManager initialisé');
    return manager;
  } catch (e) {
    bleUnavailable = true;
    console.warn(
      '[BLE] Module natif indisponible. Utilisez un development build ' +
      '(eas build --profile development --platform android).',
      e,
    );
    return null;
  }
}

const BLE_UNAVAILABLE_MSG =
  "BLE indisponible dans Expo Go. Pour scanner une turbine, vous devez utiliser un development build.";

/**
 * Décode une chaîne base64 en UTF-8 sans dépendre de Node.js Buffer.
 */
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
    const all = Object.values(grants).every(
      (g) => g === PermissionsAndroid.RESULTS.GRANTED
    );
    console.log('[BLE] Permissions Android:', grants, '→ accordées:', all);
    return all;
  }
  return true;
}

export async function scanForTurbines(
  onFound: (device: Device) => void,
  onError: (error: string) => void,
  timeoutMs: number = 15000
): Promise<void> {
  const m = getManager();
  if (!m) {
    onError(BLE_UNAVAILABLE_MSG);
    return;
  }

  const hasPermission = await requestBLEPermissions();
  if (!hasPermission) {
    onError('Permissions Bluetooth refusées');
    return;
  }

  console.log(
    `[BLE] Scan démarré. Cherche un device dont le nom commence par "${BLE_CONFIG.DEVICE_NAME_PREFIX}"`
  );

  m.startDeviceScan(null, null, (error, device) => {
    if (error) {
      console.warn('[BLE] Erreur scan:', error.message);
      onError(error.message);
      return;
    }
    if (device && device.name) {
      // Log de tous les devices vus (utile pour debug)
      console.log(
        `[BLE] Device vu: name="${device.name}" id=${device.id} rssi=${device.rssi}`
      );
      if (device.name.startsWith(BLE_CONFIG.DEVICE_NAME_PREFIX)) {
        console.log('[BLE] → Match HydroTech, ajouté à la liste');
        onFound(device);
      }
    }
  });

  setTimeout(() => {
    const m2 = getManager();
    if (m2) {
      console.log('[BLE] Scan stoppé (timeout)');
      m2.stopDeviceScan();
    }
  }, timeoutMs);
}

export function stopScan() {
  const m = getManager();
  if (m) {
    console.log('[BLE] Scan stoppé manuellement');
    m.stopDeviceScan();
  }
}

export async function connectToTurbine(
  device: Device,
  onData: (data: TurbineData) => void,
  onDisconnect: () => void,
  onError: (error: string) => void
): Promise<Device | null> {
  const m = getManager();
  if (!m) {
    onError(BLE_UNAVAILABLE_MSG);
    return null;
  }

  try {
    console.log(`[BLE] Connexion à ${device.name} (${device.id})...`);
    const connected = await device.connect();
    console.log('[BLE] Connecté, négociation MTU...');

    // Négocier un MTU plus grand pour tenir un payload JSON complet
    // (par défaut 23 octets ATT = 20 octets payload — trop petit)
    try {
      const negotiated = await connected.requestMTU(247);
      console.log(`[BLE] MTU négocié: ${negotiated.mtu} octets`);
    } catch (e) {
      console.warn('[BLE] Échec négociation MTU, on garde le défaut (20 octets payload)', e);
    }

    await connected.discoverAllServicesAndCharacteristics();
    console.log('[BLE] Services & characteristics découverts');

    // Log des services trouvés (utile pour vérifier la spec)
    try {
      const services = await connected.services();
      console.log('[BLE] Services exposés par la turbine:');
      for (const s of services) {
        console.log(`   service ${s.uuid}`);
        const chars = await s.characteristics();
        for (const c of chars) {
          console.log(
            `     - char ${c.uuid} (read=${c.isReadable}, notify=${c.isNotifiable})`
          );
        }
      }
    } catch (e) {
      console.warn('[BLE] Impossible de lister les services', e);
    }

    connected.onDisconnected(() => {
      console.log('[BLE] Déconnexion détectée');
      onDisconnect();
    });

    console.log(
      `[BLE] Souscription notify sur service=${BLE_CONFIG.SERVICE_UUID} char=${BLE_CONFIG.CHARACTERISTIC_UUID}`
    );

    connected.monitorCharacteristicForService(
      BLE_CONFIG.SERVICE_UUID,
      BLE_CONFIG.CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) {
          console.warn('[BLE] Erreur monitor:', error.message);
          onError(error.message);
          return;
        }
        if (characteristic?.value) {
          const raw = decodeBase64Utf8(characteristic.value);
          console.log(`[BLE RX] base64="${characteristic.value}" → utf8="${raw}"`);
          const data = parseBLEData(raw);
          if (data) {
            console.log(
              `[BLE RX] Parsé OK: voltage=${data.voltage}V current=${data.current}A power=${data.power}W`
            );
            onData(data);
          } else {
            console.warn(
              `[BLE RX] Parse JSON échoué — vérifier le format envoyé par l'ESP32. Reçu: "${raw}"`
            );
          }
        }
      }
    );

    return connected;
  } catch (e: any) {
    console.warn('[BLE] Erreur de connexion:', e?.message || e);
    onError(e.message || 'Erreur de connexion');
    return null;
  }
}

export async function disconnectTurbine(device: Device): Promise<void> {
  try {
    console.log(`[BLE] Déconnexion ${device.name}`);
    await device.cancelConnection();
  } catch (e) {}
}

export function destroyBLEManager() {
  const m = getManager();
  if (m) {
    console.log('[BLE] Destruction du manager');
    m.destroy();
  }
}
