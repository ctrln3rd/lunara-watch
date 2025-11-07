import { DateTime } from "luxon";
import {
  Intent,
  ForecastType,
  TimeframeType,
  PrecipitationType,
} from "../../types";

type WeatherPoint = {
  timestamp?: string;
  date?: string;
  probability?: number;
  intensity?: number;
  type?: PrecipitationType;
};

function extractTime(p: any): string {
  return p.timestamp || p.date || "";
}

function formatForecastTime(p: any, forecastType?: ForecastType): string {
  const raw = extractTime(p);
  const dt = DateTime.fromISO(raw);
  if (!dt.isValid) return raw;

  switch (forecastType) {
    case ForecastType.Hourly:
      return dt.toFormat("h a");
    case ForecastType.Daily:
      return dt.toFormat("ccc");
    default:
      return dt.toLocaleString(DateTime.DATETIME_MED);
  }
}

function describePrecipitation(point: WeatherPoint, subIntent?: string): string {
  const kind = subIntent || point.type || "precipitation";

  const probability = point.probability
    ? `${Math.round(point.probability * 100)}% chance`
    : "some chance";

  const intensity = point.intensity
    ? `${point.intensity.toFixed(1)} mm`
    : "light";

  return `${probability} of ${kind} with ${intensity} intensity`;
}

export default function precipitationInterpreter(filtered: any, intent: Intent): string {
  if (!filtered || !filtered.filtered || filtered.filtered.length === 0) {
    return `I couldn't find any precipitation data for that period.`;
  }

  const { timeframe, sub_intent, forecast_type } = intent;

  const points: WeatherPoint[] = filtered.filtered;
  const first = points[0];
  const last = points[points.length - 1];

  const timeframeCategory = (() => {
    switch (timeframe) {
      case TimeframeType.RelativeTime:
      case TimeframeType.RelativeDay: return "relative";
      case TimeframeType.AbsoluteTime: return "exact";
      case TimeframeType.AbsoluteDay: return "range";
      default: return "unknown";
    }
  })();

  const templates = {
    relative: () => {
      const next = points[0];
      const desc = describePrecipitation(next, sub_intent);
      const time = formatForecastTime(next, forecast_type);
      return `There’s a ${desc} around ${time}.`;
    },

    exact: () => {
      const next = points[0];
      const desc = describePrecipitation(next, sub_intent);
      const time = formatForecastTime(next, forecast_type);
      return `At ${time}, ${desc} is expected.`;
    },

    range: () => {
      const start = formatForecastTime(first, forecast_type);
      const end = formatForecastTime(last, forecast_type);
      const descStart = describePrecipitation(first, sub_intent);
      const descEnd = describePrecipitation(last, sub_intent);
      return `Between ${start} and ${end}, expect ${descStart}, and later ${descEnd}.`;
    },

    unknown: () => {
      const avgProb =
        points.reduce((sum, x) => sum + (x.probability || 0), 0) / points.length;
      const avgInt =
        points.reduce((sum, x) => sum + (x.intensity || 0), 0) / points.length;
      const kind = sub_intent || "precipitation";
      return `Overall, there's an average ${Math.round(
        avgProb * 100
      )}% chance of ${kind} with about ${avgInt.toFixed(1)} mm intensity.`;
    },
  };

  return templates[timeframeCategory]();
}
