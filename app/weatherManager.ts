"use client";

import {fetchTomorrowIoWeatherData} from "./tommorrowioClient";
import { fetchOpenMeteoWeather } from "./openmeteoClient";
import type { Weather, Location } from "./types";

// Cache validity threshold (used only by fetchWeather, not for auto-deletion)
const CACHE_EXPIRY_MS = 15 * 60 * 1000;

/**
 * Get cached weather by lat/lon
 * (No automatic invalidation — always returns cached data if present)
 */
export function getCachedWeather(lat: number, lon: number): Weather | null {
  const id = `lat${lat}lon${lon}`;
  const cached = localStorage.getItem(id);
  if (!cached) return null;

  try {
    const parsed: Weather = JSON.parse(cached);
    return parsed;
  } catch (err) {
    console.error("Failed to parse cached weather:", err);
    localStorage.removeItem(id);
    return null;
  }
}

/**
 * Save weather data to localStorage
 */
export function saveWeatherToCache(data: Weather) {
  try {
    localStorage.setItem(data.id, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to save weather data:", err);
  }
}

/**
 * Delete cached weather for a given location
 */
export function deleteCachedWeather(lat: number, lon: number) {
  const id = `lat${lat}lon${lon}`;
  localStorage.removeItem(id);
}

/**
 * Fetch fresh weather data — tries Tomorrow.io first, falls back to Open-Meteo.
 * Uses existing cached data if it's newer than CACHE_EXPIRY_MS.
 * Otherwise refreshes and updates cache.
 */
export async function fetchWeather(location: Location): Promise<Weather| null> {
  const { lat, lon } = location;
  const cacheId = `lat${lat}lon${lon}`;

  // 🗂️ 1. Check cache
  const cached = getCachedWeather(lat, lon);
  const isExpired = cached ? Date.now() - cached.timestamp > CACHE_EXPIRY_MS : true;

  // ✅ If cache exists and is fresh → return immediately
  if (cached && !isExpired) {
    console.log("✅ Using fresh cached weather data for", cacheId);
    return cached;
  }

  // 🌤️ 2. Try Tomorrow.io first
  try {
    console.log("🌍 Fetching from Tomorrow.io...");
    const result = await fetchTomorrowIoWeatherData(lat, lon);
    if (!result) return cached ?? null;

    const weatherData: Weather = {
      id: cacheId,
      data: result,
      timestamp: Date.now(),
      source: "tomorrow.io",
    };
    saveWeatherToCache(weatherData);
    return weatherData;
  } catch (err) {
    console.warn("Tomorrow.io failed, falling back to Open-Meteo:", err);
  }

  // 🌦️ 3. Fallback to Open-Meteo
  try {
    console.log("🌍 Fetching from Open-Meteo...");
    const result = await fetchOpenMeteoWeather(lat, lon);
    if (!result) return cached ?? null;

    const weatherData: Weather = {
      id: cacheId,
      data: result,
      timestamp: Date.now(),
      source: "open-meteo",
    };
    saveWeatherToCache(weatherData);
    return weatherData;
  } catch (err) {
    console.error("Both weather providers failed:", err);
    // Return old cached data if available instead of null
    return cached ?? null;
  }
}
