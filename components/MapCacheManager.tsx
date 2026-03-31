import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'hydrotech_waterways_cache';

export async function saveWaterwaysCache(key: string, ways: any[]) {
  try {
    const existing = await AsyncStorage.getItem(CACHE_KEY);
    const cache = existing ? JSON.parse(existing) : {};
    cache[key] = { ways, timestamp: Date.now() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {}
}

export async function getWaterwaysCache(key: string): Promise<any[] | null> {
  try {
    const existing = await AsyncStorage.getItem(CACHE_KEY);
    if (!existing) return null;
    const cache = JSON.parse(existing);
    if (cache[key]) {
      const age = Date.now() - cache[key].timestamp;
      if (age < 7 * 24 * 60 * 60 * 1000) return cache[key].ways;
    }
  } catch (e) {}
  return null;
}

export async function preloadWaterways(
  lat: number,
  lng: number,
  onData: (ways: any[]) => void
) {
  const key = `${Math.floor(lat / 0.08)}_${Math.floor(lng / 0.08)}`;
  
  const cached = await getWaterwaysCache(key);
  if (cached) {
    onData(cached);
    return;
  }

  const radius = 10000;
  const query = `
    [out:json][timeout:10];
    (
      way["waterway"~"river|stream|canal|waterfall"](around:${radius},${lat},${lng});
    );
    out geom qt;
  `;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    const ways = data.elements
      .filter((el: any) => el.geometry && el.geometry.length > 1)
      .map((el: any) => {
        const coords = el.geometry.map((g: any) => ({
          latitude: g.lat,
          longitude: g.lon,
        }));
        return {
          id: el.id,
          type: el.tags?.waterway ?? 'stream',
          name: el.tags?.name ?? '',
          width: el.tags?.width ? parseFloat(el.tags.width) : undefined,
          coords,
          midPoint: coords[Math.floor(coords.length / 2)],
        };
      });
    await saveWaterwaysCache(key, ways);
    onData(ways);
  } catch (e) {
    console.log('Preload error:', e);
  }
}