import { fetchWeatherApi } from "openmeteo";
import { fromUnixTime, formatISO } from "date-fns";
import {
  Weather,
  CurrentEntity,
  HourlyEntity,
  DailyEntity,
  PrecipitationType,
  WeatherCondition,
  WeatherIcon,
  Location,
} from "./types";

// ✅ Fetch 7-day forecast from Open-Meteo
export async function fetchOpenMeteoWeather(
  lat: number,
  lon: number
): Promise<Weather["data"] | null> {
  const params = {
    latitude: lat,
    longitude: lon,
    hourly: [
      "temperature_2m",
      "apparent_temperature",
      "precipitation_probability",
      "precipitation",
      "weathercode",
      "cloudcover",
      "windspeed_10m",
      "winddirection_10m",
      "pressure_msl",
      "visibility",
      "relative_humidity_2m",
      "uv_index",
    ],
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "apparent_temperature_min",
      "precipitation_sum",
      "precipitation_probability_max",
      "weathercode",
      "sunrise",
      "sunset",
      "uv_index_max",
      "windspeed_10m_max",
      "winddirection_10m_dominant",
      "pressure_msl",
      "cloudcover_mean",
    ],
    forecast_days: 7,
    timezone: "auto",
  };

  const responses = await fetchWeatherApi(
    "https://api.open-meteo.com/v1/forecast",
    params
  );
  const response = responses[0];
  if (!response) throw new Error("No Open-Meteo response");

  const hourly = response.hourly();
  const daily = response.daily();
  if (!hourly || !daily) throw new Error("Invalid Open-Meteo data");

  const hourlyTimes = Array.from(hourly.time() as any) as number[];
  const dailyTimes = Array.from(daily.time() as any) as number[];

  // ----------------------------
  // 🌤️ Hourly Data (next 7 days)
  // ----------------------------
  const hourlyData: HourlyEntity[] = hourlyTimes.map((t, i) => {
    const code = hourly.variables(4)?.valuesArray()?.[i] ?? 0;
    const dateISO = formatISO(fromUnixTime(Number(t)));

    return {
      timestamp: dateISO,
      temperature: hourly.variables(0)?.valuesArray()?.[i] ?? 0,
      feelsLike: hourly.variables(1)?.valuesArray()?.[i] ?? 0,
      humidity: hourly.variables(10)?.valuesArray()?.[i] ?? 0,
      pressure: hourly.variables(8)?.valuesArray()?.[i] ?? 0,
      uvIndex: hourly.variables(11)?.valuesArray()?.[i] ?? 0,
      windSpeed: hourly.variables(6)?.valuesArray()?.[i] ?? 0,
      windDirection: hourly.variables(7)?.valuesArray()?.[i] ?? 0,
      precipitation: hourly.variables(3)?.valuesArray()?.[i] ?? 0,
      precipitationProbability: hourly.variables(2)?.valuesArray()?.[i] ?? 0,
      cloudCover: hourly.variables(5)?.valuesArray()?.[i] ?? 0,
      precipitationType: getPrecipitationType(code) as PrecipitationType,
      condition: normalizeCondition(getWeatherCondition(code)),
      icon: normalizeIcon(getWeatherIcon(code)),
    };
  });

  // ----------------------------
  // 🌞 Daily Data (next 7 days)
  // ----------------------------
  const dailyData: DailyEntity[] = dailyTimes.map((t, i) => {
    const code = daily.variables(6)?.valuesArray()?.[i] ?? 0;
    const dateISO = formatISO(fromUnixTime(Number(t)));

    const sunriseUnix = daily.variables(7)?.valuesArray()?.[i];
    const sunsetUnix = daily.variables(8)?.valuesArray()?.[i];

    return {
      date: dateISO,
      temperatureMax: daily.variables(0)?.valuesArray()?.[i] ?? 0,
      temperatureMin: daily.variables(1)?.valuesArray()?.[i] ?? 0,
      feelsLikeMax: daily.variables(2)?.valuesArray()?.[i] ?? 0,
      feelsLikeMin: daily.variables(3)?.valuesArray()?.[i] ?? 0,
      humidity: 0, // Open-Meteo doesn't provide daily average humidity
      pressure: daily.variables(12)?.valuesArray()?.[i] ?? 0,
      uvIndex: daily.variables(9)?.valuesArray()?.[i] ?? 0,
      windSpeed: daily.variables(10)?.valuesArray()?.[i] ?? 0,
      windDirection: daily.variables(11)?.valuesArray()?.[i] ?? 0,
      precipitation: daily.variables(4)?.valuesArray()?.[i] ?? 0,
      precipitationProbability: daily.variables(5)?.valuesArray()?.[i] ?? 0,
      cloudCover: daily.variables(13)?.valuesArray()?.[i] ?? 0,
      precipitationType: getPrecipitationType(code) as PrecipitationType,
      sunRise: sunriseUnix ? formatISO(fromUnixTime(Number(sunriseUnix))) : "",
      sunSet: sunsetUnix ? formatISO(fromUnixTime(Number(sunsetUnix))) : "",
      moonRise: "",
      moonSet: "",
      moonPhase: undefined,
      condition: normalizeCondition(getWeatherCondition(code)),
      icon: normalizeIcon(getWeatherIcon(code)),
    };
  });

  // ----------------------------
  // 🌡 Current Data (most recent hour)
  // ----------------------------
  const latest = hourlyData[0];
  const current: CurrentEntity = {
    timestamp: latest.timestamp,
    temperature: latest.temperature,
    feelsLike: latest.feelsLike,
    humidity: latest.humidity,
    pressure: latest.pressure,
    uvIndex: latest.uvIndex,
    visibility: hourly.variables(9)?.valuesArray()?.[0] ?? 0,
    windSpeed: latest.windSpeed,
    windDirection: latest.windDirection,
    precipitation: latest.precipitation,
    precipitationProbability: latest.precipitationProbability,
    precipitationType: latest.precipitationType,
    condition: latest.condition,
    icon: latest.icon,
  };

  // ----------------------------
  // ✅ Return unified Weather object
  // ----------------------------
  return {
     current, hourly: hourlyData, daily: dailyData
  };
}

// ==================================================
// 🔧 Helpers to normalize condition/icon enums
// ==================================================
function normalizeCondition(text: string): WeatherCondition {
  const lower = text.toLowerCase();
  if (lower.includes("clear")) return WeatherCondition.Clear;
  if (lower.includes("partly")) return WeatherCondition.PartlyCloudy;
  if (lower.includes("cloud")) return WeatherCondition.Cloudy;
  if (lower.includes("rain")) return WeatherCondition.Rain;
  if (lower.includes("snow")) return WeatherCondition.Snow;
  if (lower.includes("thunder")) return WeatherCondition.Thunderstorm;
  if (lower.includes("fog")) return WeatherCondition.Fog;
  return WeatherCondition.Clear;
}

function normalizeIcon(name: string): WeatherIcon {
  const lower = name.toLowerCase();
  if (lower.includes("sun")) return WeatherIcon.Clear;
  if (lower.includes("partly")) return WeatherIcon.PartlyCloudy;
  if (lower.includes("cloud")) return WeatherIcon.Cloudy;
  if (lower.includes("rain")) return WeatherIcon.Rain;
  if (lower.includes("thunder")) return WeatherIcon.Thunderstorm;
  if (lower.includes("snow")) return WeatherIcon.Snow;
  if (lower.includes("fog")) return WeatherIcon.Fog;
  return WeatherIcon.Clear;
}


//MAPPERS

export function getWeatherCondition(code: number): WeatherCondition {
  if ([0].includes(code)) return WeatherCondition.Clear;
  if ([1, 2].includes(code)) return WeatherCondition.PartlyCloudy;
  if ([3].includes(code)) return WeatherCondition.Cloudy;
  if ([45, 48].includes(code)) return WeatherCondition.Fog;
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return WeatherCondition.Rain;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return WeatherCondition.Snow;
  if ([95, 96, 99].includes(code)) return WeatherCondition.Thunderstorm;

  return WeatherCondition.Clear; // fallback
}

export function getPrecipitationType(code: number): PrecipitationType {
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return PrecipitationType.Rain;
  if ([71, 73, 75, 77, 85, 86].includes(code))
    return PrecipitationType.Snow;

  return PrecipitationType.None;
}

export function getWeatherIcon(code: number): WeatherIcon {
  const condition = getWeatherCondition(code);
  switch (condition) {
    case WeatherCondition.Clear:
      return WeatherIcon.Clear;
    case WeatherCondition.PartlyCloudy:
      return WeatherIcon.PartlyCloudy;
    case WeatherCondition.Cloudy:
      return WeatherIcon.Cloudy;
    case WeatherCondition.Rain:
      return WeatherIcon.Rain;
    case WeatherCondition.Snow:
      return WeatherIcon.Snow;
    case WeatherCondition.Thunderstorm:
      return WeatherIcon.Thunderstorm;
    case WeatherCondition.Fog:
      return WeatherIcon.Fog;
    default:
      return WeatherIcon.Clear;
  }
}
