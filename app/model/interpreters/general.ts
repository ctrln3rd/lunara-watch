import { DateTime } from "luxon";
import {
  Intent,
  ForecastType,
  TimeframeType,
  WeatherCondition,
} from "../../types";


function formatTime(time: string, forecastType?: ForecastType): string {
  const dt = DateTime.fromISO(time);
  if (!dt.isValid) return time;

  switch (forecastType) {
    case ForecastType.Hourly:
      return dt.toFormat("h a");
    case ForecastType.Daily:
      return dt.toFormat("ccc");
    default:
      return dt.toLocaleString(DateTime.DATETIME_FULL);
  }
}

function summarizeConditions(points: any) {
  const conditions = points
    .map((p: any) => p.condition || "")
    .filter(Boolean);

  if (conditions.length === 0) return "mixed conditions";

  // most frequent condition
  const freq: Record<string, number> = {};
  conditions.forEach((c: any) => (freq[c] = (freq[c] || 0) + 1));

  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  return sorted[0][0]; // dominant condition
}

function avg(values: (number | undefined)[]): number {
  const list = values.filter((v): v is number => typeof v === "number");
  if (list.length === 0) return 0;
  return list.reduce((a, b) => a + b, 0) / list.length;
}

export default function generalInterpreter(
  filtered: any,
  intent: Intent
): string {
  if (!filtered || !filtered.filtered || filtered.filtered.length === 0) {
    return `I couldn't find forecast data for that time.`;
  }

  const { timeframe, forecast_type } = intent;
  const points: any = filtered.filtered;

  const first = points[0];
  const last = points[points.length - 1];

  // Extract stats
  const avgTemp = avg(points.map((p:any) => p.temperature));
  const minTemp =
    Math.min(...points.map((p: any) => p.temperatureMin ?? p.temperature ?? 999));
  const maxTemp =
    Math.max(...points.map((p: any) => p.temperatureMax ?? p.temperature ?? -999));

  const avgCloud = avg(points.map((p: any) => p.cloudCover));
  const avgWind = avg(points.map((p: any) => p.windSpeed));
  const avgPrecipProb = avg(points.map((p: any) => p.precipitationProbability));
  const conditionSummary = summarizeConditions(points);

  // Describe sky
  const cloudDesc =
    avgCloud < 20
      ? "mostly clear skies"
      : avgCloud < 50
      ? "partly cloudy conditions"
      : avgCloud < 80
      ? "mostly cloudy skies"
      : "overcast conditions";

  // Describe precip
  const precipDesc =
    avgPrecipProb > 0.6
      ? "a high chance of precipitation"
      : avgPrecipProb > 0.3
      ? "some chance of precipitation"
      : "little to no precipitation expected";

  // Timeframe categories just like precipitation interpreter
  const timeframeCategory = (() => {
    switch (timeframe) {
      case TimeframeType.RelativeTime:
      case TimeframeType.RelativeDay:
        return "relative";
      case TimeframeType.AbsoluteTime:
        return "exact";
      case TimeframeType.AbsoluteDay:
        return "range";
      default:
        return "unknown";
    }
  })();

  const templates: Record<
    "relative" | "exact" | "range" | "unknown",
    (p: any) => string
  > = {
    relative: () => {
      const time = formatTime(first.time, forecast_type);
      return `Around ${time}, expect ${cloudDesc}. Temperatures will be around ${Math.round(
        avgTemp
      )}°C, with highs near ${Math.round(
        maxTemp
      )}°C. There is ${Math.round(
        avgPrecipProb * 100
      )}% chance of precipitation.`;
    },

    exact: () => {
      const time = formatTime(first.time, forecast_type);
      return `At ${time}, the weather will feature ${cloudDesc}. Expect about ${Math.round(
        avgTemp
      )}°C, with winds around ${Math.round(avgWind)} km/h and ${Math.round(
        avgPrecipProb * 100
      )}% rain chance.`;
    },

    range: () => {
      const start = formatTime(first.time, forecast_type);
      const end = formatTime(last.time, forecast_type);
      return `From ${start} to ${end}, the overall forecast includes ${cloudDesc}. Temperatures will range from about ${Math.round(
        minTemp
      )}°C to ${Math.round(
        maxTemp
      )}°C. There is ${Math.round(
        avgPrecipProb * 100
      )}% chance of precipitation and winds near ${Math.round(
        avgWind
      )} km/h.`;
    },

    unknown: () => {
      return `Overall, expect ${cloudDesc} with temperatures averaging around ${Math.round(
        avgTemp
      )}°C (low of ${Math.round(minTemp)}°C, high of ${Math.round(
        maxTemp
      )}°C). There is ${Math.round(
        avgPrecipProb * 100
      )}% chance of precipitation and typical winds of ${Math.round(
        avgWind
      )} km/h.`;
    },
  };

  return templates[timeframeCategory](points);
}
