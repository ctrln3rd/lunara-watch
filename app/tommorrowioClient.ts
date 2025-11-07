import {
  Weather,
  CurrentEntity,
  HourlyEntity,
  DailyEntity,
  PrecipitationType,
  WeatherCondition,
  WeatherIcon,
} from "./types";
import { getTommorrowIoWeather } from "./tommorrowioServer";

  
export async function fetchTomorrowIoWeatherData(
  lat: number,
  lon: number
): Promise<Weather["data"] | null> {
  const data = await getTommorrowIoWeather(lat, lon);
  if (!data) return null;

  // === CURRENT ===
  const currentValues = data.timelines?.hourly?.[0]?.values;
  const current: CurrentEntity ={
        timestamp: data.timelines.hourly[0].time,
        temperature: currentValues.temperature,
        feelsLike: currentValues.temperatureApparent,
        humidity: currentValues.humidity ?? 0,
        pressure: currentValues.pressureSurfaceLevel ?? 0,
        uvIndex: currentValues.uvIndex ?? 0,
        visibility: currentValues.visibility ?? 0,
        windSpeed: currentValues.windSpeed ?? 0,
        windDirection: currentValues.windDirection ?? 0,
        precipitation: currentValues.precipitationIntensity ?? 0,
        precipitationProbability: currentValues.precipitationProbability ?? 0,
        precipitationType: getPrecipitationType(currentValues.weatherCode),
        condition: getWeatherCondition(currentValues.weatherCode),
        icon: getWeatherIcon(currentValues.weatherCode),
      };

  // === HOURLY ===
  const hourly: HourlyEntity[] =
    data.timelines?.hourly?.map((h: any) => {
      const v = h.values;
      return {
        timestamp: h.time,
        temperature: v.temperature,
        feelsLike: v.temperatureApparent,
        humidity: v.humidity ?? 0,
        pressure: v.pressureSurfaceLevel ?? 0,
        uvIndex: v.uvIndex ?? 0,
        windSpeed: v.windSpeed ?? 0,
        windDirection: v.windDirection ?? 0,
        precipitation: v.precipitationIntensity ?? 0,
        precipitationProbability: v.precipitationProbability ?? 0,
        cloudCover: v.cloudCover ?? 0,
        precipitationType: getPrecipitationType(v.weatherCode),
        condition: getWeatherCondition(v.weatherCode),
        icon: getWeatherIcon(v.weatherCode),
      };
    }) ?? [];

  // === DAILY ===
  const daily: DailyEntity[] =
    data.timelines?.daily?.map((d: any) => {
      const v = d.values;
      return {
        date: d.time,
        temperatureMax: v.temperatureMax,
        temperatureMin: v.temperatureMin,
        feelsLikeMax: v.temperatureApparentMax ?? v.temperatureMax,
        feelsLikeMin: v.temperatureApparentMin ?? v.temperatureMin,
        humidity: v.humidityAvg ?? 0,
        pressure: v.pressureSurfaceLevelAvg ?? 0,
        uvIndex: v.uvIndexMax ?? 0,
        windSpeed: v.windSpeedAvg ?? 0,
        windDirection: v.windDirectionAvg ?? 0,
        precipitation: v.precipitationAccumulation ?? 0,
        precipitationProbability: v.precipitationProbability ?? 0,
        cloudCover: v.cloudCoverAvg ?? 0,
        precipitationType: getPrecipitationType(v.weatherCode),
        sunRise: v.sunriseTime,
        sunSet: v.sunsetTime,
        moonPhase: v.moonPhase,
        condition: getWeatherCondition(v.weatherCode),
        icon: getWeatherIcon(v.weatherCode),
      };
    }) ?? [];

  return {
    current,
    hourly,
    daily,
  };
}

// MAPPERS

/** === TOMORROW.IO WEATHER CODE MAPPER === */
export function getWeatherCondition(code: number): WeatherCondition {
  if ([1000, 1100].includes(code)) return WeatherCondition.Clear;
  if ([1101].includes(code)) return WeatherCondition.PartlyCloudy;
  if ([1102].includes(code)) return WeatherCondition.Cloudy;
  if ([2000, 2100].includes(code)) return WeatherCondition.Fog;
  if ([4000, 4001, 4200, 4201].includes(code)) return WeatherCondition.Rain;
  if ([5000, 5100, 5101].includes(code)) return WeatherCondition.Snow;
  if ([8000].includes(code)) return WeatherCondition.Thunderstorm;
  return WeatherCondition.Clear;
}

export function getPrecipitationType(code: number): PrecipitationType {
  if ([4000, 4001, 4200, 4201].includes(code)) return PrecipitationType.Rain;
  if ([5000, 5100, 5101].includes(code)) return PrecipitationType.Snow;
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
    case WeatherCondition.Thunderstorm:
      return WeatherIcon.Thunderstorm;
    case WeatherCondition.Snow:
      return WeatherIcon.Snow;
    case WeatherCondition.Fog:
      return WeatherIcon.Fog;
    default:
      return WeatherIcon.Clear;
  }
}
