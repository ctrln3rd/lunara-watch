"use client";

import { Location, LocationType } from "./types";
import tzlookup from "tz-lookup";

const STORAGE_KEY = "locations";

// 🔹 Local storage helpers
export function getSavedLocations(): Location[] {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

export function saveLocations(locations: Location[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
}

// 🔹 Add or replace location (1 per type)
export function addLocation(newLoc: Location): Location[] {
  const locations = getSavedLocations();

  // Fill timezone if missing
  if (!newLoc.timezone) {
    newLoc.timezone = tzlookup(newLoc.lat, newLoc.lon);
  }

  // Replace existing location of the same type
  const index = locations.findIndex((l) => l.type === newLoc.type);
  if (index !== -1) {
    locations[index] = newLoc;
  } else {
    locations.push(newLoc);
  }

  saveLocations(locations);
  return locations;
}

// 🔹 Delete location by type
export function deleteLocation(type: Location["type"]): Location[] {
  const locations = getSavedLocations();
  const updated = locations.filter((l) => l.type !== type);
  saveLocations(updated);
  return updated;
}

// 🔹 Search locations using OpenStreetMap (no API key)
export async function searchLocations(query: string): Promise<Location[]> {
  if (!query) return [];

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=3&q=${encodeURIComponent(
      query
    )}`
  );
  const data = await res.json();
  if (!data || data.length === 0) return [];

  return data.map((place: any) => ({
    name: place.display_name.split(",")[0],
    lat: parseFloat(place.lat),
    lon: parseFloat(place.lon),
    type: "other",
    timezone: tzlookup(parseFloat(place.lat), parseFloat(place.lon)),
  }));
}

// 🔹 Get current location from browser
export async function getCurrentLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject("Geolocation not supported");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
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
            type: LocationType.Other,
            timezone: tzlookup(latitude, longitude),
          });
        } catch {
          reject("Failed to fetch location info");
        }
      },
      (err) => reject(err.message)
    );
  });
}
