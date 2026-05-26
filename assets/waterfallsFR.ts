/**
 * Liste statique des chutes d'eau majeures de France.
 * Bundlée dans l'app — toujours disponible, même offline complet.
 *
 * Format compatible avec le type WaterWay de WaterMap.tsx :
 *   { id, type: "waterfall", name, coords: [pt], midPoint: pt, isPoint: true }
 *
 * Sources : OpenStreetMap, Wikipédia, sites de tourisme régionaux.
 * ~50 chutes d'eau notables, réparties sur toute la France.
 */

type StaticWaterfall = {
  id: number;
  name: string;
  region: string;
  lat: number;
  lng: number;
  height?: number; // hauteur en mètres si connue
};

export const FRANCE_WATERFALLS: StaticWaterfall[] = [
  // === ALPES ===
  { id: 100001, name: "Cascade du Rouget", region: "Haute-Savoie", lat: 46.0539, lng: 6.7639, height: 90 },
  { id: 100002, name: "Cascade du Dard", region: "Haute-Savoie", lat: 45.9131, lng: 6.8825 },
  { id: 100003, name: "Cascade d'Arpenaz", region: "Haute-Savoie", lat: 46.0644, lng: 6.6264, height: 270 },
  { id: 100004, name: "Cascade de Sauffaz", region: "Haute-Savoie", lat: 46.0444, lng: 6.7708 },
  { id: 100005, name: "Cascade de la Pisse", region: "Hautes-Alpes", lat: 44.6694, lng: 6.4778 },
  { id: 100006, name: "Cascade de Salins", region: "Hautes-Alpes", lat: 44.6306, lng: 6.4528 },
  { id: 100007, name: "Cascade du Saut du Laire", region: "Isère", lat: 45.0233, lng: 5.7983 },
  { id: 100008, name: "Cascade de l'Oule", region: "Hautes-Alpes", lat: 44.5694, lng: 6.4231 },
  { id: 100009, name: "Cascade de la Fare", region: "Isère", lat: 45.1056, lng: 6.0617 },
  { id: 100010, name: "Cascade de Confolens", region: "Isère", lat: 44.8683, lng: 6.1450 },

  // === PYRÉNÉES ===
  { id: 100011, name: "Grande Cascade de Gavarnie", region: "Hautes-Pyrénées", lat: 42.6967, lng: -0.0094, height: 422 },
  { id: 100012, name: "Cascade d'Ars", region: "Ariège", lat: 42.7344, lng: 1.3792, height: 246 },
  { id: 100013, name: "Cascade du Cinca", region: "Hautes-Pyrénées", lat: 42.6917, lng: 0.0292 },
  { id: 100014, name: "Cascade de Lutour", region: "Hautes-Pyrénées", lat: 42.8469, lng: -0.1339 },
  { id: 100015, name: "Cascade du Pont d'Espagne", region: "Hautes-Pyrénées", lat: 42.8703, lng: -0.1419 },
  { id: 100016, name: "Cascade de la Pisse (Cauterets)", region: "Hautes-Pyrénées", lat: 42.8717, lng: -0.1494 },
  { id: 100017, name: "Cascade de Sidonie", region: "Hautes-Pyrénées", lat: 42.7517, lng: -0.0219 },

  // === JURA ===
  { id: 100018, name: "Cascade du Hérisson - Éventail", region: "Jura", lat: 46.6131, lng: 5.8567, height: 65 },
  { id: 100019, name: "Cascade du Hérisson - Grand Saut", region: "Jura", lat: 46.6172, lng: 5.8606, height: 60 },
  { id: 100020, name: "Cascade des Tufs", region: "Jura", lat: 46.7264, lng: 5.6889 },
  { id: 100021, name: "Cascade de la Billaude", region: "Jura", lat: 46.6753, lng: 5.8275, height: 28 },
  { id: 100022, name: "Saut du Doubs", region: "Doubs", lat: 47.0939, lng: 6.7128, height: 27 },
  { id: 100023, name: "Cascade des Combes", region: "Doubs", lat: 47.1239, lng: 6.7194 },

  // === VOSGES ===
  { id: 100024, name: "Grande Cascade de Tendon", region: "Vosges", lat: 48.1083, lng: 6.7028, height: 32 },
  { id: 100025, name: "Petite Cascade de Tendon", region: "Vosges", lat: 48.1056, lng: 6.7058 },
  { id: 100026, name: "Cascade de Faymont", region: "Vosges", lat: 47.9494, lng: 6.6661 },
  { id: 100027, name: "Cascade du Saut de la Bourrique", region: "Vosges", lat: 47.9722, lng: 6.6500 },

  // === MASSIF CENTRAL / AUVERGNE ===
  { id: 100028, name: "Cascade du Ray-Pic", region: "Ardèche", lat: 44.7444, lng: 4.2956, height: 60 },
  { id: 100029, name: "Cascade de la Beaume", region: "Haute-Loire", lat: 44.9847, lng: 4.0531 },
  { id: 100030, name: "Cascade du Saillant", region: "Corrèze", lat: 45.3217, lng: 1.4625 },
  { id: 100031, name: "Cascade des Vaux", region: "Cantal", lat: 45.0358, lng: 2.7392 },
  { id: 100032, name: "Cascade de Murel", region: "Corrèze", lat: 45.2253, lng: 1.7719 },
  { id: 100033, name: "Cascade du Sartre", region: "Cantal", lat: 45.1208, lng: 2.7917 },
  { id: 100034, name: "Cascade de la Pisserotte", region: "Haute-Loire", lat: 45.0875, lng: 4.1819 },

  // === CORSE ===
  { id: 100035, name: "Cascade des Anglais", region: "Haute-Corse", lat: 42.1300, lng: 9.1622 },
  { id: 100036, name: "Cascade de Radule", region: "Haute-Corse", lat: 42.3081, lng: 8.9189 },
  { id: 100037, name: "Cascade de Polischellu", region: "Corse-du-Sud", lat: 41.7831, lng: 9.3267 },
  { id: 100038, name: "Cascade Rabbianca", region: "Haute-Corse", lat: 42.3167, lng: 8.9389 },
  { id: 100039, name: "Cascade de l'Aïtone", region: "Corse-du-Sud", lat: 42.2378, lng: 8.7394 },
  { id: 100040, name: "Cascades de Purcaraccia", region: "Corse-du-Sud", lat: 41.7950, lng: 9.2972 },

  // === BRETAGNE ===
  { id: 100041, name: "Cascade Saint-Herbot", region: "Finistère", lat: 48.3550, lng: -3.8467 },
  { id: 100042, name: "Cascade du Stangala", region: "Finistère", lat: 48.0244, lng: -4.0297 },

  // === LIMOUSIN / NORMANDIE ===
  { id: 100043, name: "Cascades des Jarrauds", region: "Creuse", lat: 45.8628, lng: 1.7858 },
  { id: 100044, name: "Cascade du Saut du Loup", region: "Lot", lat: 44.7553, lng: 1.6722 },
  { id: 100045, name: "Cascade de Mortain", region: "Manche", lat: 48.6481, lng: -0.9489, height: 25 },

  // === ALSACE / FRANCHE-COMTÉ ===
  { id: 100046, name: "Cascade du Nideck", region: "Bas-Rhin", lat: 48.5683, lng: 7.3617, height: 25 },
  { id: 100047, name: "Cascade du Hohwald", region: "Bas-Rhin", lat: 48.4014, lng: 7.3258 },
  { id: 100048, name: "Cascade de la Serva", region: "Doubs", lat: 47.0167, lng: 6.4167 },

  // === LANGUEDOC / PROVENCE ===
  { id: 100049, name: "Cascade de Sillans", region: "Var", lat: 43.5306, lng: 6.2050, height: 42 },
  { id: 100050, name: "Cascade de Courmes", region: "Alpes-Maritimes", lat: 43.7906, lng: 7.0028, height: 40 },
  { id: 100051, name: "Cascade des Demoiselles", region: "Alpes-Maritimes", lat: 43.9183, lng: 7.0672 },
  { id: 100052, name: "Cascade du Tine", region: "Alpes-Maritimes", lat: 43.9558, lng: 7.0461 },

  // === RHÔNE / BOURGOGNE ===
  { id: 100053, name: "Cascade du Bief de la Ruine", region: "Doubs", lat: 47.1133, lng: 6.6864 },
  { id: 100054, name: "Cascade du Théry", region: "Saône-et-Loire", lat: 46.6442, lng: 4.5267 },
];

/**
 * Convertit la liste statique au format WaterWay attendu par WaterMap.
 */
export function getStaticWaterfallsAsWaterways(): any[] {
  return FRANCE_WATERFALLS.map((w) => {
    const pt = { latitude: w.lat, longitude: w.lng };
    return {
      id: w.id,
      type: "waterfall",
      name: w.name + (w.height ? ` (${w.height}m)` : ""),
      width: undefined,
      coords: [pt],
      midPoint: pt,
      isPoint: true,
    };
  });
}
