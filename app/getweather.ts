// -----------------------------
// 🌍 SERVER FUNCTION
// -----------------------------
"use server";

import axios from "axios";

const API_KEY = process.env.TOMORROW_API_KEY as string;

export async function getWeather(lat: number, lon: number) {
  try {
    const response = await axios.post(
      `https://api.tomorrow.io/v4/timelines?apikey=${API_KEY}`,
      {
        location: `${lat}, ${lon}`, 
        fields: [
          "temperature",
          "moonPhase",
          "precipitationProbability",
          "weatherCode",
          "precipitationIntensity",
          "precipitationType",
          "windSpeed",
          "windDirection",
        ],
        units: "metric",
        timesteps: ["1h", "current", "1d"],
        startTime: "now",
        endTime: "nowPlus120h",
        dailyStartHour: 6,
      }
    );
    return response.data;
  } catch (err: any) {
    throw new Error(err.message || "Failed to fetch weather");
  }
}


