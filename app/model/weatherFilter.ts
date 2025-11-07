import { DateTime } from "luxon";
import {
  Weather,
  Intent,
  ForecastType,
  HourlyEntity,
  DailyEntity,
} from "../types"; // adjust path if needed

/**
 * Filters weather data based on intent start, end and forecast type
 */
export function filterWeatherByIntent(weather: Weather, intent: Intent) {
  if (!weather?.data || !intent) return null;

  const { start, end, forecast_type = ForecastType.All } = intent;
  const startDate = start ? DateTime.fromISO(start) : null;
  const endDate = end ? DateTime.fromISO(end) : null;

  // Normalize forecast type
  const isHourly = forecast_type === ForecastType.Hourly;
  const isDaily = forecast_type === ForecastType.Daily;

  const inRange = (ts: string): boolean => {
    const t = DateTime.fromISO(ts);
    if (!startDate && !endDate) return true;
    if (startDate && endDate) return t >= startDate && t <= endDate;
    if (startDate) return t >= startDate;
    if (endDate) return t <= endDate;
    return false;
  };

  let filtered: (HourlyEntity | DailyEntity)[];

  if (isHourly) {
    filtered = weather.data.hourly.filter((h) => inRange(h.timestamp));
  } else if (isDaily) {
    filtered = weather.data.daily.filter((d) => inRange(d.date));
  } else {
    // ForecastType.All → merge both
    filtered = [
      ...weather.data.hourly.filter((h) => inRange(h.timestamp)),
      ...weather.data.daily.filter((d) => inRange(d.date)),
    ];
  }

  // Return consistent structure
  return {
    id: weather.id,
    forecastType: forecast_type,
    start: startDate?.toISO() ?? null,
    end: endDate?.toISO() ?? null,
    count: filtered.length,
    filtered,
  };
}
