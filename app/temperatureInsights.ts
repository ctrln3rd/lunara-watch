import { parseISO, isToday, isTomorrow, isThisWeek, format, isWeekend } from "date-fns";
import { WeatherValues, Insight } from "./types";

// --- Types ---

// --- Helpers ---
function getTimeOfDay(date: Date): "morning" | "afternoon" | "evening" | "night" {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

function getDayPhrase(date: Date): string {
  if (isToday(date)) return "today";
  if (isTomorrow(date)) return "tomorrow";
  if (isWeekend(date) && isThisWeek(date)) return "this weekend";
  if (isWeekend(date) && !isThisWeek(date)) return "next weekend";
  if (!isThisWeek(date)) return `next week ${format(date, "EEEE")}`;
  return format(date, "EEEE");
}

// --- Main function ---
export function generateTemperatureInsights(
  hourly: WeatherValues[],
  daily: WeatherValues[]
): Insight[] {
  const insights: Insight[] = [];

  // --- Hourly warmest/coldest ---
  if (hourly?.length) {
    const hottest = [...hourly.slice(0, 24)].sort((a, b) => b.temperature - a.temperature)[0];
    const coldest = [...hourly.slice(0, 24)].sort((a, b) => a.temperature - b.temperature)[0];

    if (hottest) {
      const d = parseISO(hottest.startTime);
      insights.push({
        text: `${getDayPhrase(d)} ${getTimeOfDay(d)} will be the next warmest time at ${Math.round(
          hottest.temperature
        )}°C.`,
        icon: "ThermometerSun", // 🌡☀️
      });
    }

    if (coldest) {
      const d = parseISO(coldest.startTime);
      insights.push({
        text: `${getDayPhrase(d)} ${getTimeOfDay(d)} will be the next coldest time at ${Math.round(
          coldest.temperature
        )}°C.`,
        icon: "ThermometerSnowflake", // 🌡❄️
      });
    }
  }

  // --- Daily warmest/coldest ---
  if (daily?.length) {
    const warmest = [...daily].sort((a, b) => b.temperature - a.temperature)[0];
    const coldest = [...daily].sort((a, b) => a.temperature - b.temperature)[0];

    if (warmest) {
      const d = parseISO(warmest.startTime);
      insights.push({
        text: `${getDayPhrase(d)} is the warmest day at ${Math.round(warmest.temperature)}°C.`,
        icon: "Sun",
      });
    }

    if (coldest) {
      const d = parseISO(coldest.startTime);
      insights.push({
        text: `${getDayPhrase(d)} is the coldest day at ${Math.round(coldest.temperature)}°C.`,
        icon: "Snowflake",
      });
    }

    // --- Trend (first vs last few days) ---
    if (daily.length >= 3) {
      const first = daily[0].temperature;
      const last = daily[daily.length - 1].temperature;
      const diff = last - first;

      if (Math.abs(diff) < 2) {
        insights.push({
          text: "Temperatures will stay steady over the coming days.",
          icon: "ArrowLeftRight",
        });
      } else if (diff > 0) {
        insights.push({
          text: "Warming trend over the next few days.",
          icon: "TrendingUp",
        });
      } else {
        insights.push({
          text: "Cooling trend over the next few days.",
          icon: "TrendingDown",
        });
      }
    }

    // --- Anomaly detection ---
    for (let i = 1; i < daily.length; i++) {
      const prev = daily[i - 1].temperature;
      const curr = daily[i].temperature;
      const jump = curr - prev;

      if (jump >= 5) {
        const d = parseISO(daily[i].startTime);
        insights.push({
          text: `Sharp temperature rise expected on ${getDayPhrase(d)} (up to ${Math.round(
            curr
          )}°C).`,
          icon: "ArrowUp",
        });
      } else if (jump <= -5) {
        const d = parseISO(daily[i].startTime);
        insights.push({
          text: `Sharp temperature drop expected on ${getDayPhrase(d)} (down to ${Math.round(
            curr
          )}°C).`,
          icon: "ArrowDown",
        });
      }
    }
  }

  return insights;
}
