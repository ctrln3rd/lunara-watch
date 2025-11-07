import { DateTime } from "luxon";


export function getDateRange(relativeDay: string): {start: string, end: string} {
  const now = DateTime.now().setZone("local");
  let start = now;
  let end = now;

  const normalize = (d: DateTime) => d.toFormat("yyyy-MM-dd");

  switch (relativeDay.toLowerCase()) {
    case "unspecified":
      return { start: normalize(now), end: normalize(now) };

    case "this week":
      start = now.startOf("week");
      end = now.endOf("week");
      break;

    case "next week":
      start = now.plus({ weeks: 1 }).startOf("week");
      end = now.plus({ weeks: 1 }).endOf("week");
      break;

    case "weekend":
    case "this weekend": {
      // Assuming weekend = Saturday + Sunday
      const saturday = now.set({ weekday: 6 });
      const sunday = now.set({ weekday: 7 });
      if (now.weekday > 7) {
        // if past Sunday, move to next week
        start = saturday.plus({ weeks: 1 });
        end = sunday.plus({ weeks: 1 });
      } else {
        start = saturday;
        end = sunday;
      }
      break;
    }

    case "next weekend": {
      const saturday = now.plus({ weeks: 1 }).set({ weekday: 6 });
      const sunday = now.plus({ weeks: 1 }).set({ weekday: 7 });
      start = saturday;
      end = sunday;
      break;
    }

    // Handle "in X days"
    default: {
      const matchIn = relativeDay.match(/^in (\d+) days$/);
      const matchNext = relativeDay.match(/^next (\d+) days$/);

      if (matchIn) {
        const days = parseInt(matchIn[1], 10);
        start = now.plus({ days });
        end = start;
      } else if (matchNext) {
        const days = parseInt(matchNext[1], 10);
        start = now;
        end = now.plus({ days });
      } else {
        // fallback = today
        start = now;
        end = now;
      }
    }
  }

  return { start: normalize(start), end: normalize(end) };
}
