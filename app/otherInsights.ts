import { parseISO, format } from "date-fns";
import { WeatherValues } from "./types";

// Helper: moon phases (Tomorrow.io gives 0–1 cycle)
function getMoonPhaseName(moonPhase: number): string {
  if (moonPhase === 0 || moonPhase === 1) return "New Moon";
  if (moonPhase === 0.25) return "First Quarter";
  if (moonPhase === 0.5) return "Full Moon";
  if (moonPhase === 0.75) return "Last Quarter";
  return "";
}

function getDayPhrase(date: Date): string {
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "today";
  if (date.toDateString() === new Date(today.getTime() + 86400000).toDateString())
    return "tomorrow";
  return format(date, "EEEE");
}

function getTimeOfDay(date: Date): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

export function generateOtherInsights(
  hourly: WeatherValues[],
  daily: WeatherValues[]
): string[] {
  const insights: string[] = [];

  // 🌕 Full moon or special moon phases
  daily.forEach(d => {
    const moon = getMoonPhaseName(d.moonPhase);
    if (moon) {
      const date = parseISO(d.startTime);
      insights.push(`${moon} is on ${getDayPhrase(date)}.`);
    }
  });

  // 💨 Strong winds (hourly check)
  const strongWindHour = hourly.find(h => h.windSpeed > 40); // threshold
  if (strongWindHour) {
    const d = parseISO(strongWindHour.startTime);
    insights.push(
      `Strong winds expected ${getDayPhrase(d)} ${getTimeOfDay(d)} at around ${format(d, "h a")}.`
    );
  }

  // 💨 Strong winds (daily max wind)
  const windyDay = daily.find(d => d.windSpeed > 40);
  if (windyDay) {
    const d = parseISO(windyDay.startTime);
    insights.push(`Windy conditions expected on ${getDayPhrase(d)}.`);
  }

  // 🌡 Extreme hot/cold alerts
  daily.forEach(d => {
    if (d.temperature >= 35) {
      const date = parseISO(d.startTime);
      insights.push(`Very hot conditions expected on ${getDayPhrase(date)}.`);
    }
    if (d.temperature <= 5) {
      const date = parseISO(d.startTime);
      insights.push(`Cold day expected on ${getDayPhrase(date)}.`);
    }
  });

  // ⚡ Severe weather (based on weatherCode ranges)
  const stormHour = hourly.find(h => h.weatherCode >= 8000); // thunderstorm codes
  if (stormHour) {
    const d = parseISO(stormHour.startTime);
    insights.push(
      `Thunderstorm risk ${getDayPhrase(d)} ${getTimeOfDay(d)}.`
    );
  }

  return insights;
}
