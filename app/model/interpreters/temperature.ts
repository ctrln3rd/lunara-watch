import { DateTime } from "luxon";
import {
  Intent,
  ForecastType,
  TimeframeType,
} from "../../types";

type Point = {
  timestamp?: string;
  date?: string;
  temperature?: number;
  temperatureMin?: number;
  temperatureMax?: number;
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

export default function temperatureInterpreter(filtered: any, intent: Intent): string {
  if (!filtered || !filtered.filtered || filtered.filtered.length === 0) {
    return `I couldn't find temperature data for that time.`;
  }

  const { sub_intent, timeframe, forecast_type } = intent;
  const points: Point[] = filtered.filtered;

  const temps = points.map(p =>
    p.temperature ?? p.temperatureMax ?? p.temperatureMin
  );

  const numericTemps = temps.filter((t): t is number => t !== undefined);

  const avg =
    numericTemps.length > 0
      ? numericTemps.reduce((sum, t) => sum + t, 0) / numericTemps.length
      : 0;

  const min =
    Math.min(...points.map(p => p.temperatureMin ?? p.temperature ?? 999));

  const max =
    Math.max(...points.map(p => p.temperatureMax ?? p.temperature ?? -999));

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

  const describe = () => {
    switch (sub_intent) {
      case "min": return `a minimum of ${Math.round(min)}°C`;
      case "max": return `a maximum of ${Math.round(max)}°C`;
      case "avg": return `an average of ${Math.round(avg)}°C`;
      default: return `around ${Math.round(avg)}°C`;
    }
  };

  const templates = {
    relative: () => {
      const time = formatForecastTime(first, forecast_type);
      return `Around ${time}, expect ${describe()}.`;
    },

    exact: () => {
      const time = formatForecastTime(first, forecast_type);
      return `At ${time}, expect ${describe()}.`;
    },

    range: () => {
      const start = formatForecastTime(first, forecast_type);
      const end = formatForecastTime(last, forecast_type);
      return `From ${start} to ${end}, temperatures will be ${describe()}.`;
    },

    unknown: () => {
      return `Overall, temperatures will be ${describe()}.`;
    },
  };

  return templates[timeframeCategory]();
}
