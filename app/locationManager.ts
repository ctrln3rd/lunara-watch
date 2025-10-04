import { Location } from "./types";

const STORAGE_KEY = "locations";

// 🔹 Get saved locations from localStorage
export function getSavedLocations(): Location[] {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

// 🔹 Save locations to localStorage
function saveToStorage(locations: Location[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
}

// 🔹 Add a new location (limit 5)
export function addLocation(newLoc: Location): Location[] {
  const locations = getSavedLocations();
  if (locations.find((l) => l.lat === newLoc.lat && l.lon === newLoc.lon)) {
    return locations; // already exists
  }
  if (locations.length >= 5) {
    throw new Error("You can only save up to 5 locations.");
  }
  const updated = [...locations, newLoc];
  saveToStorage(updated);
  return updated;
}

// 🔹 Delete a location by name
export function deleteLocation(name: string): Location[] {
  const locations = getSavedLocations();
  const updated = locations.filter((l) => l.name !== name);
  saveToStorage(updated);
  return updated;
}

// 🔹 Try to get user’s current location with reverse geocoding
export async function getCurrentLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;

          // Use Nominatim reverse geocoding to get city/town name
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();

          const displayName =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.state ||
            "Unknown Location";

          resolve({
            name: displayName,
            lat: latitude,
            lon: longitude,
            isCurrent: true,
          });
        } catch (err) {
          reject("Failed to fetch location name");
        }
      },
      (err) => reject(err.message)
    );
  });
}

// 🔹 Search location with Nominatim (limit 3 results)
export async function searchLocations(query: string): Promise<Location[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=3&q=${encodeURIComponent(
      query
    )}`
  );
  const data = await res.json();
  if (data.length === 0) return [];

  return data.map((place: any) => ({
    name: place.display_name.split(",")[0],
    lat: parseFloat(place.lat),
    lon: parseFloat(place.lon),
    isCurrent: false,
  }));
}
