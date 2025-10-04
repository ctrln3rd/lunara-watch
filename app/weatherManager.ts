 import { getWeather } from "./getweather";
 import { WeatherValues, WeatherData } from "./types";

function normalizeWeather(apiResponse: any): {
  current: WeatherValues | null;
  hourly: WeatherValues[];
  daily: WeatherValues[];
} {
  const timelines = apiResponse.data.timelines;

  // current (single interval)
  const current = timelines.find((t: any) => t.timestep === "current")
    ?.intervals.map((i: any) => ({
      startTime: i.startTime,
      ...i.values,
    }))[0] || null;

  // hourly intervals
  const hourly = timelines.find((t: any) => t.timestep === "1h")
    ?.intervals.map((i: any) => ({
      startTime: i.startTime,
      ...i.values,
    })) || [];

  // daily intervals
  const daily = timelines.find((t: any) => t.timestep === "1d")
    ?.intervals.map((i: any) => ({
      startTime: i.startTime,
      ...i.values,
    })) || [];

  return { current, hourly, daily };
}


const STORAGE_KEY = "weather_data";

// 🔹 Get saved weather data (all)
export function getSavedWeather(): WeatherData[] {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

// 🔹 Save all weather data
function saveToStorage(data: WeatherData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 🔹 Get cached weather for a specific location
export function getWeatherForLocation(lat: number, lon: number): WeatherData | null {
  const all = getSavedWeather();
  return all.find((w) => w.lat === lat && w.lon === lon) || null;
}

// 🔹 Add or update weather data (localStorage)
export function saveWeather(locationName: string, lat: number, lon: number, apiResponse: any) {
  const all = getSavedWeather();
  const timestamp = Date.now();

  const filtered = normalizeWeather(apiResponse);

  const updated: WeatherData = { locationName, lat, lon, data: filtered, timestamp };

  const idx = all.findIndex((w) => w.lat === lat && w.lon === lon);
  if (idx >= 0) {
    all[idx] = updated;
  } else {
    all.push(updated);
  }

  saveToStorage(all);
  return updated;
}

// 🔹 Delete weather data for a location
export function deleteWeather(lat: number, lon: number) {
  const all = getSavedWeather();
  const updated = all.filter((w) => w.lat !== lat || w.lon !== lon);
  saveToStorage(updated);
  return updated;
}

// 🔹 Get weather (use cache if recent, else fetch new)
export async function getOrUpdateWeather(
  locationName: string,
  lat: number,
  lon: number,
  maxAgeMinutes = 30
): Promise<WeatherData> {
  const cached = getWeatherForLocation(lat, lon);

  if (cached && Date.now() - cached.timestamp < maxAgeMinutes * 60 * 1000) {
    return cached;
  }

  const fresh = await getWeather(lat, lon); // call server fn
  return saveWeather(locationName, lat, lon, fresh);
}

// 🔹 Fetch weather (only if last fetch > 15 min ago)
export async function fetchWeather(locationName: string, lat: number, lon: number): Promise<WeatherData> {
  const cached = getWeatherForLocation(lat, lon);
  const FIFTEEN_MIN = 15 * 60 * 1000;

  if (cached && Date.now() - cached.timestamp < FIFTEEN_MIN) {
    // Too soon → return cached
    return cached;
  }

  // Otherwise → fetch fresh and save
  const fresh = await getWeather(lat, lon);
  return saveWeather(locationName, lat, lon, fresh);
}

