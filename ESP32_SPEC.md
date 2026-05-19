# Spécification BLE — Turbine HydroTech (ESP32)

Document destiné à l'ingénieur firmware ESP32. Il décrit **exactement** ce que
l'app HydroTech (React Native + react-native-ble-plx) attend de la turbine.

---

## 1. Identifiants BLE (à respecter à l'octet près)

| Élément              | Valeur                                  |
|----------------------|-----------------------------------------|
| Nom du device        | doit **commencer** par `HydroTech`      |
| Service UUID         | `12345678-1234-1234-1234-123456789012`  |
| Characteristic UUID  | `87654321-4321-4321-4321-210987654321`  |
| Propriétés caract.   | **NOTIFY** (obligatoire) + READ (recommandé) |
| MTU minimum          | 64 octets — l'app demande 247 octets    |

Exemples de noms valides : `HydroTech`, `HydroTech-001`, `HydroTech-A1B2`.

L'app filtre les devices au scan : seuls ceux dont le nom commence par
`HydroTech` apparaissent dans la liste. Tout autre device est ignoré.

---

## 2. Format du payload

L'ESP32 doit envoyer une **chaîne JSON encodée UTF-8** sur la caractéristique
ci-dessus, via NOTIFY. Format exact :

```json
{"voltage":12.45,"current":1.23,"power":15.31}
```

| Clé       | Type       | Unité  | Plage typique |
|-----------|------------|--------|---------------|
| `voltage` | float      | Volts  | 10.0 — 17.0   |
| `current` | float      | Ampères| 0.0 — 10.0    |
| `power`   | float      | Watts  | 0.0 — 100.0   |

- Toutes les clés doivent être présentes. Les valeurs peuvent être 0.
- L'ordre des clés n'est pas important.
- Le JSON ne doit **pas** contenir de retour à la ligne final (`\n`) ni
  d'espaces superflus (économie de bande passante).
- Encodage : **UTF-8** (l'ASCII suffit pour ce payload).
- L'app lit ces 3 champs ; tout champ supplémentaire est ignoré (vous pouvez
  donc ajouter `temp`, `rpm`, etc. sans casser l'app, mais ils ne seront pas
  exploités tant que l'app n'est pas mise à jour).

### Pourquoi MTU 247 ?

Une trame JSON typique fait 45–60 octets. La MTU BLE par défaut est de 23
octets (= 20 octets de payload utile), donc la trame serait coupée. L'app
demande automatiquement une MTU de 247 octets après connexion. **L'ESP32 doit
accepter cette négociation** (`BLEDevice::setMTU(247)` ou utiliser
NimBLE-Arduino qui gère ça automatiquement).

---

## 3. Cadence d'envoi

**Une notification toutes les ~10 secondes** suffit (la valeur
`BLE_CONFIG.REFRESH_INTERVAL` côté app est à 10 000 ms).

Vous pouvez envoyer plus vite (toutes les 1–2 s) si vous voulez du temps réel,
mais ça consomme plus de batterie sur l'ESP32.

---

## 4. Exemple de code Arduino (NimBLE-Arduino)

À installer dans Arduino IDE → Library Manager :
- **NimBLE-Arduino** (par h2zero) — recommandé, plus léger que BLE classique.

```cpp
#include <Arduino.h>
#include <NimBLEDevice.h>

#define DEVICE_NAME         "HydroTech-001"
#define SERVICE_UUID        "12345678-1234-1234-1234-123456789012"
#define CHARACTERISTIC_UUID "87654321-4321-4321-4321-210987654321"
#define NOTIFY_INTERVAL_MS  10000

NimBLECharacteristic* pTurbineChar = nullptr;
bool deviceConnected = false;

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo) override {
    deviceConnected = true;
    Serial.println("[BLE] Client connecté");
    // L'app demandera 247 — on accepte (NimBLE le fait tout seul)
  }
  void onDisconnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo, int reason) override {
    deviceConnected = false;
    Serial.printf("[BLE] Client déconnecté (raison %d), redémarrage de l'advertising\n", reason);
    NimBLEDevice::startAdvertising();
  }
};

void setup() {
  Serial.begin(115200);
  Serial.println("HydroTech BLE init...");

  NimBLEDevice::init(DEVICE_NAME);
  NimBLEDevice::setMTU(247);            // côté serveur : autoriser une grande MTU
  NimBLEDevice::setPower(ESP_PWR_LVL_P9);

  NimBLEServer* pServer = NimBLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  NimBLEService* pService = pServer->createService(SERVICE_UUID);
  pTurbineChar = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
  );

  // Valeur initiale (lue par l'app au moment de la souscription)
  pTurbineChar->setValue("{\"voltage\":0,\"current\":0,\"power\":0}");

  pService->start();

  NimBLEAdvertising* pAdv = NimBLEDevice::getAdvertising();
  pAdv->addServiceUUID(SERVICE_UUID);
  pAdv->setName(DEVICE_NAME);
  pAdv->enableScanResponse(true);
  NimBLEDevice::startAdvertising();

  Serial.println("Advertising en cours, en attente de l'app HydroTech...");
}

// Remplacez ces 3 fonctions par vos vraies mesures (ADC, capteurs, etc.)
float readVoltage() { return 12.0f + (random(0, 100) / 100.0f); }
float readCurrent() { return 1.0f + (random(0, 100) / 100.0f);  }
float readPower(float v, float i) { return v * i; }

void loop() {
  static uint32_t lastNotify = 0;
  uint32_t now = millis();

  if (deviceConnected && (now - lastNotify >= NOTIFY_INTERVAL_MS)) {
    lastNotify = now;

    float v = readVoltage();
    float i = readCurrent();
    float p = readPower(v, i);

    char payload[80];
    snprintf(payload, sizeof(payload),
             "{\"voltage\":%.2f,\"current\":%.2f,\"power\":%.2f}",
             v, i, p);

    pTurbineChar->setValue((uint8_t*)payload, strlen(payload));
    pTurbineChar->notify();

    Serial.printf("[BLE TX] %s\n", payload);
  }

  delay(10);
}
```

---

## 5. Test rapide côté ESP32 (sans l'app)

Avant de tester avec l'app, votre collègue peut valider la turbine BLE avec
**nRF Connect for Mobile** (gratuit, dispo Android/iOS) :

1. Ouvrir nRF Connect → onglet **Scanner**.
2. Le device `HydroTech-001` doit apparaître dans la liste.
3. Cliquer **Connect**.
4. Le service `12345678-...` doit s'afficher.
5. La caractéristique `87654321-...` avec **NOTIFY** activable (icône avec 3 flèches).
6. Cliquer sur l'icône notify → vous devez voir une nouvelle ligne toutes les
   10 s avec le JSON décodé en UTF-8 (option « Display value as: UTF-8 »).

Si ça marche dans nRF Connect, alors ça marchera dans l'app HydroTech.

---

## 6. Vérification côté app (debug)

L'app log toutes les étapes de la connexion BLE dans la console Metro
(le terminal où tourne `npx expo start`). À chercher dans les logs après
connexion :

```
[BLE] Scan démarré. Cherche un device dont le nom commence par "HydroTech"
[BLE] Device vu: name="HydroTech-001" id=AA:BB:CC:DD:EE:FF rssi=-67
[BLE] → Match HydroTech, ajouté à la liste
[BLE] Connexion à HydroTech-001 (AA:BB:CC:DD:EE:FF)...
[BLE] Connecté, négociation MTU...
[BLE] MTU négocié: 247 octets
[BLE] Services exposés par la turbine:
   service 12345678-1234-1234-1234-123456789012
     - char 87654321-4321-4321-4321-210987654321 (read=true, notify=true)
[BLE] Souscription notify sur service=... char=...
[BLE RX] base64="eyJ2b2x0YWdlIjoxMi40NSwiY3VycmVudCI6MS4yMywicG93ZXIiOjE1LjMxfQ==" → utf8="{"voltage":12.45,"current":1.23,"power":15.31}"
[BLE RX] Parsé OK: voltage=12.45V current=1.23A power=15.31W
```

Si vous voyez `[BLE RX] Parse JSON échoué`, le format envoyé par l'ESP32 n'est
pas correct. Si vous voyez `Échec négociation MTU`, l'ESP32 doit accepter
MTU 247 (cf. setMTU dans l'exemple).

---

## 7. Checklist de déploiement

Côté firmware ESP32 :
- [ ] Nom du device commence bien par `HydroTech`
- [ ] Service UUID = `12345678-1234-1234-1234-123456789012`
- [ ] Characteristic UUID = `87654321-4321-4321-4321-210987654321`
- [ ] Propriété NOTIFY activée sur la characteristic
- [ ] MTU 247 acceptée
- [ ] Payload JSON UTF-8 avec clés `voltage`, `current`, `power`
- [ ] Notification émise toutes les ~10 s quand un client est connecté
- [ ] Re-démarrage de l'advertising après une déconnexion
- [ ] Validation préalable avec nRF Connect

Côté app HydroTech :
- [ ] Build dev installé (l'APK généré par `eas build --profile development --platform android`)
- [ ] Permissions Bluetooth + Position accordées au premier lancement
- [ ] Bluetooth activé sur le téléphone
- [ ] Téléphone à moins de ~10 m de l'ESP32

---

## 8. Évolutions possibles (à discuter)

- **Heartbeat** : ajouter un champ `ts` (timestamp epoch ms) dans le payload
  pour détecter les trames perdues / reconstruire un graphique temporel.
- **Détection batterie pleine** : ajouter un champ `batteryFull: true` quand
  la turbine détecte qu'une batterie atteint 100 %.
- **Commandes app → turbine** : si plus tard on veut piloter la turbine
  (start/stop, reset compteurs), il faudra une 2ᵉ characteristic en WRITE.
- **Plusieurs turbines simultanées** : déjà supporté côté app (carrousel),
  il suffit que chaque ESP32 ait un nom unique : `HydroTech-001`, `HydroTech-002`.
