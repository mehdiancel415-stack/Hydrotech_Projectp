/* eslint-disable */
/**
 * Télécharge toutes les chutes d'eau de France (OSM via Overpass).
 * Utilise le module `https` natif (pas fetch) → compatible toutes versions Node.
 * Diagnostique les erreurs réseau (DNS, pare-feu, antivirus).
 *
 * Usage : node scripts/fetch-waterfalls-fr.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const { URL } = require("url");

const OUT = path.join(__dirname, "..", "assets", "waterfalls-fr.json");

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];

const REGIONS = [
  { name: "Nord-Ouest", bbox: [47.0, -5.5, 51.5, 1.0] },
  { name: "Nord-Est",   bbox: [47.0,  1.0, 51.5, 9.5] },
  { name: "Centre",     bbox: [44.5, -5.5, 47.0, 4.0] },
  { name: "Centre-Est", bbox: [44.5,  4.0, 47.0, 9.5] },
  { name: "Sud-Ouest",  bbox: [41.0, -5.5, 44.5, 4.0] },
  { name: "Sud-Est+Corse", bbox: [41.0, 4.0, 44.5, 10.5] },
];

function buildQuery(bbox) {
  const [s, w, n, e] = bbox;
  return `[out:json][timeout:120];
(
  node["natural"="waterfall"](${s},${w},${n},${e});
  node["waterway"="waterfall"](${s},${w},${n},${e});
  way["waterway"="waterfall"](${s},${w},${n},${e});
);
out geom;`;
}

// Requête HTTPS avec module natif — bypass certains soucis de fetch
function httpsPost(urlStr, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
          "User-Agent": "HydroTech/1.0 (waterfall fetcher)",
        },
        timeout: 180000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const data = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, body: data });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          }
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(new Error("timeout 3min")); });
    req.write(body);
    req.end();
  });
}

// Test diagnostique : un GET tout simple pour vérifier la connectivité
function testConnectivity(host) {
  return new Promise((resolve) => {
    const req = https.get(`https://${host}/`, { timeout: 10000 }, (res) => {
      resolve({ ok: true, status: res.statusCode });
      res.resume();
    });
    req.on("error", (e) => resolve({ ok: false, error: e.message + (e.code ? ` (${e.code})` : "") }));
    req.on("timeout", () => { req.destroy(); resolve({ ok: false, error: "timeout 10s" }); });
  });
}

async function fetchRegion(region, attempt = 0) {
  const ep = ENDPOINTS[attempt % ENDPOINTS.length];
  const body = "data=" + encodeURIComponent(buildQuery(region.bbox));
  console.log(`  [${region.name}] → ${new URL(ep).hostname}`);
  try {
    const { body: txt } = await httpsPost(ep, body);
    const data = JSON.parse(txt);
    const count = data.elements?.length || 0;
    console.log(`    ✓ ${count} éléments`);
    return data;
  } catch (e) {
    console.log(`    ✗ ${e.message}`);
    if (attempt < ENDPOINTS.length * 2 - 1) {
      await new Promise((r) => setTimeout(r, 4000));
      return fetchRegion(region, attempt + 1);
    }
    return null;
  }
}

async function main() {
  console.log(`Node version : ${process.version}`);
  console.log(`Plateforme   : ${process.platform}\n`);

  // === Diagnostic réseau d'abord ===
  console.log("Test de connectivité (GET https://overpass-api.de/) :");
  const tConn = await testConnectivity("overpass-api.de");
  if (!tConn.ok) {
    console.error(`  ❌ ÉCHEC : ${tConn.error}`);
    console.error(`\n  → Cause probable :`);
    if (tConn.error.includes("ENOTFOUND")) {
      console.error(`     • DNS bloqué ou pas de réseau`);
    } else if (tConn.error.includes("ECONNREFUSED")) {
      console.error(`     • Connexion refusée (pare-feu / antivirus)`);
    } else if (tConn.error.includes("ETIMEDOUT") || tConn.error.includes("timeout")) {
      console.error(`     • Réseau trop lent ou bloqué`);
    } else if (tConn.error.includes("CERT") || tConn.error.includes("self-signed")) {
      console.error(`     • Certificat SSL bloqué (proxy d'entreprise ?)`);
    } else {
      console.error(`     • Erreur réseau bas niveau`);
    }
    console.error(`\n  Que faire :`);
    console.error(`     1. Désactivez TEMPORAIREMENT votre antivirus / pare-feu`);
    console.error(`     2. Essayez sur un autre réseau (4G partage de connexion)`);
    console.error(`     3. Si vous êtes dans un réseau d'entreprise/école : proxy probable`);
    console.error(`     4. L'app marche déjà avec 150 chutes statiques bundlées — pas obligé de lancer ce script`);
    process.exit(1);
  }
  console.log(`  ✓ HTTP ${tConn.status} — réseau OK\n`);

  // === Téléchargement par régions ===
  console.log("Téléchargement par régions :");
  const allElements = [];
  const seenIds = new Set();
  let regionsOK = 0;

  for (const region of REGIONS) {
    const data = await fetchRegion(region);
    if (!data) {
      console.log(`  ⚠ ${region.name} : abandon`);
      continue;
    }
    regionsOK++;
    for (const el of data.elements || []) {
      if (!seenIds.has(el.id)) {
        seenIds.add(el.id);
        allElements.push(el);
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (allElements.length === 0) {
    console.error(`\n❌ 0 chute récupérée, mais le réseau marchait au test !`);
    console.error(`   → Overpass est probablement saturé. Réessayez dans 1 heure.`);
    console.error(`   → L'app utilise les 150 chutes statiques en attendant.`);
    process.exit(1);
  }

  // === Conversion ===
  const waterfalls = [];
  for (const el of allElements) {
    if (el.type === "node") {
      if (typeof el.lat !== "number" || typeof el.lon !== "number") continue;
      waterfalls.push({
        id: el.id, type: "waterfall", name: el.tags?.name || "",
        lat: el.lat, lng: el.lon,
        height: el.tags?.height ? parseFloat(el.tags.height) : undefined,
      });
    } else if (el.type === "way" && el.geometry && el.geometry.length > 0) {
      const mid = el.geometry[Math.floor(el.geometry.length / 2)];
      waterfalls.push({
        id: el.id, type: "waterfall", name: el.tags?.name || "",
        lat: mid.lat, lng: mid.lon,
        height: el.tags?.height ? parseFloat(el.tags.height) : undefined,
      });
    }
  }

  waterfalls.sort((a, b) => a.id - b.id);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(waterfalls, null, 0));
  const named = waterfalls.filter((w) => w.name).length;

  console.log(`\n✅ Régions OK : ${regionsOK}/${REGIONS.length}`);
  console.log(`✅ Total : ${waterfalls.length} chutes (${named} nommées)`);
  console.log(`✅ Taille : ${(fs.statSync(OUT).size / 1024).toFixed(1)} KB`);
  console.log(`✅ Écrit : ${OUT}`);
  console.log(`\nLes chutes seront chargées au prochain reload Metro.`);
}

main().catch((e) => {
  console.error("Erreur fatale :", e.message);
  process.exit(1);
});
