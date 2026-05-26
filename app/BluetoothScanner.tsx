// Ce fichier était un duplicata du composant components/BluetoothScanner.tsx.
// Il est présent dans le dossier app/, donc expo-router le considère comme
// une route. On le rend inerte (rend null) pour éviter de polluer le bundle
// avec ses imports BLE alors qu'il n'est pas utilisé. Le vrai BluetoothScanner
// est importé depuis components/BluetoothScanner.tsx par app/(tabs)/index.tsx.
export default function _UnusedBluetoothScannerRoute() {
  return null;
}
