export type Location = { name: string; lat: number; lon: number, isCurrent: boolean };

// 🌤 Weather values returned by Tomorrow.io API (with startTime merged in)
export interface WeatherValues {
  startTime: string;          // merged here
  temperature: number;
  moonPhase: number;
  precipitationProbability: number;
  precipitationIntensity: number;
  precipitationType: number;
  weatherCode: number;
  windSpeed: number;
  windDirection: number;
}

// 🔹 Our cached wrapper with location + timestamp
export interface WeatherData {
  locationName: string;
  lat: number;
  lon: number;
  data:{
  current: WeatherValues | null,
  hourly: WeatherValues[],
  daily: WeatherValues[]
  }
  timestamp: number;
}


export interface Insight {
  text: string;
  icon: string; // Lucide icon name
}
