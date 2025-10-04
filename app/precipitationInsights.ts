import { parseISO, format } from "date-fns";
import { WeatherValues } from "./types";

export interface Insight {
  text: string;
  icon: string; // lucide icon name
}

// --- Helpers ---
function getTimeOfDay(date: Date): "morning" | "afternoon" | "evening" | "night" {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

function getDayPhrase(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);

  if (date.toDateString() === today.toDateString()) return "today";
  if (date.toDateString() === tomorrow.toDateString()) return "tomorrow";
  return format(date, "EEEE"); // e.g. "Saturday"
}

function getPrecipitationType(type: number): { label: string; icon: string } {
  switch (type) {
    case 1: return { label: "rain", icon: "CloudRain" };
    case 2: return { label: "snow", icon: "Snowflake" };
    case 3: return { label: "freezing rain", icon: "CloudDrizzle" };
    case 4: return { label: "ice pellets", icon: "CloudHail" };
    default: return { label: "precipitation", icon: "Cloud" };
  }
}

// --- Main Combined Function ---
export function generatePrecipitationInsights(
  hourly: WeatherValues[],
  daily: WeatherValues[]
): Insight[] {
  const insights: Insight[] = [];

  // 🔹 1. Next rainy/snowy hour → summarized as daily insight
  const nextRain = hourly.find(h => h.precipitationProbability > 10 && h.precipitationType > 0);
  if (nextRain) {
    const d = parseISO(nextRain.startTime);
    const type = getPrecipitationType(nextRain.precipitationType);
    insights.push({
      text: `${type.label} expected ${getDayPhrase(d)} ${getTimeOfDay(d)} around ${format(d, "h a")}.`,
      icon: type.icon,
    });
  }

  // 🔹 2. Next rainy/snowy day (from daily forecast)
  const nextRainyDay = daily.find(d => d.precipitationProbability > 10 && d.precipitationType > 0);
  if (nextRainyDay) {
    const d = parseISO(nextRainyDay.startTime);
    const type = getPrecipitationType(nextRainyDay.precipitationType);
    insights.push({
      text: `${type.label} expected on ${getDayPhrase(d)}.`,
      icon: type.icon,
    });
  }

  // 🔹 3. Detect stop event (from hourly → summarize)
  for (let i = 0; i < hourly.length - 1; i++) {
    const curr = hourly[i];
    const next = hourly[i + 1];

    if (curr.precipitationProbability > 10 && next.precipitationProbability < 5) {
      const d = parseISO(next.startTime);
      const type = getPrecipitationType(curr.precipitationType);
      insights.push({
        text: `${type.label} will taper off by ${getDayPhrase(d)} ${getTimeOfDay(d)}.`,
        icon: "CloudOff",
      });
      break;
    }
  }

  // 🔹 4. Trends → rainy streaks vs dry streaks
  const rainyDays = daily.filter(d => d.precipitationProbability > 10);
  if (rainyDays.length >= 3) {
    insights.push({
      text: "Unsettled weather with precipitation likely over several days.",
      icon: "CloudRain",
    });
  } else if (rainyDays.length >= 1) {
    insights.push({
      text: "Scattered precipitation expected in the coming days.",
      icon: "CloudRain",
    });
  } else {
    insights.push({
      text: "Mostly dry conditions expected in the coming days.",
      icon: "CloudOff",
    });
  }

  return insights;
}

