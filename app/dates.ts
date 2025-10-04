import {
  addDays,
  getDay,
  isBefore,
  isToday,
  isTomorrow,
  startOfWeek,
  endOfWeek,
  addWeeks,
  format,
} from "date-fns";

type DateInput = Date | string;

export function intelligentDatePhrase(date: DateInput): string {
  const today = new Date();
  const startWeek = startOfWeek(today, { weekStartsOn: 1 });
  const endWeek = endOfWeek(today, { weekStartsOn: 1 });
  const nextWeekStart = addWeeks(startWeek, 1);
  const nextWeekEnd = addWeeks(endWeek, 1);

  const d = typeof date === "string" ? new Date(date) : date;

  if (isBefore(d, today)) return ""; // ignore past dates

  const dayNum = getDay(d);
  const dayName = format(d, "EEEE").toLowerCase();

  if (isToday(d)) return "today";
  if (isTomorrow(d)) return "tomorrow";

  if (d >= startWeek && d <= endWeek) {
    if (dayNum === 6) return "this weekend on saturday";
    if (dayNum === 0) return "this weekend on sunday";
    return dayName; // weekday this week
  }

  if (d >= nextWeekStart && d <= nextWeekEnd) {
    if (dayNum === 6) return "next weekend on saturday";
    if (dayNum === 0) return "next weekend on sunday";
    return `${dayName} next week`;
  }

  return dayName; // fallback
}


function getPartOfDay(hour: number): string {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}


type HourlyInput = Date | string;

export function intelligentHourlyPhrase(hourly: HourlyInput): string {
  const date = typeof hourly === "string" ? new Date(hourly) : hourly;
  const now = new Date();
  const dayNum = getDay(date); // 0 = Sunday
  const dayName = format(date, "EEEE").toLowerCase();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const partOfDay = getPartOfDay(hour);

  let timeStr = minute > 0 ? `${hour % 12 || 12}:${minute.toString().padStart(2,"0")} ${hour >= 12 ? "PM" : "AM"}` 
                            : `${hour % 12 || 12} ${hour >= 12 ? "PM" : "AM"}`;

  // Today / Tomorrow
  if (isToday(date)) return `today ${partOfDay} at ${timeStr}`;
  if (isTomorrow(date)) return `tomorrow ${partOfDay} at ${timeStr}`;

  // This week or next week
  const daysFromToday = Math.floor((date.getTime() - now.getTime()) / (1000*60*60*24));
  if (daysFromToday < 7) return `${dayName} ${partOfDay} at ${timeStr}`;
  return `${dayName} next week ${partOfDay} at ${timeStr}`;
}