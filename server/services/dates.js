// All dates are plain YYYY-MM-DD strings in Indian time.
// Keeping them as strings avoids timezone drift between server, db and browser.

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function todayIST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

export function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekday(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

export function dayIndex(name) {
  if (!name) return -1;
  const n = name.toLowerCase();
  return DAY_NAMES.findIndex((d) => d.startsWith(n.slice(0, 3)));
}

export function isValidDate(str) {
  return typeof str === "string" && /^\d{4}-\d{2}-\d{2}$/.test(str) && !Number.isNaN(Date.parse(str));
}

function daysUntil(today, targetDay, { allowToday }) {
  let diff = (targetDay - weekday(today) + 7) % 7;
  if (diff === 0 && !allowToday) diff = 7;
  return diff;
}

function nightsBetween(checkIn, checkOut) {
  return Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000);
}

/**
 * Turns an intent like { when: "this_weekend" } into real dates.
 * The model only tells us what the guest meant; the calendar maths happens here,
 * because language models are unreliable at counting days.
 *
 * Weekend means Saturday check in, Monday check out (Saturday and Sunday nights).
 */
export function resolveStay(filters, today = todayIST()) {
  const { when, dayOfWeek, checkIn, checkOut } = filters;
  let nights = filters.nights && filters.nights > 0 ? filters.nights : null;
  let start = null;

  switch (when) {
    case "today":
    case "tonight":
      start = today;
      break;
    case "tomorrow":
      start = addDays(today, 1);
      break;
    case "this_weekend": {
      const wd = weekday(today);
      if (wd === 0) {
        start = today; // Already Sunday, so only Sunday night is left
        nights = nights || 1;
      } else {
        start = addDays(today, daysUntil(today, 6, { allowToday: true }));
      }
      nights = nights || 2;
      break;
    }
    case "next_weekend": {
      const thisSaturday = addDays(today, daysUntil(today, 6, { allowToday: true }));
      start = weekday(today) === 0 ? addDays(today, 6) : addDays(thisSaturday, 7);
      nights = nights || 2;
      break;
    }
    case "day_of_week": {
      const idx = dayIndex(dayOfWeek);
      if (idx >= 0) start = addDays(today, daysUntil(today, idx, { allowToday: true }));
      break;
    }
    case "specific":
      if (isValidDate(checkIn)) start = checkIn;
      if (start && isValidDate(checkOut) && checkOut > start) nights = nightsBetween(start, checkOut);
      break;
    default:
      break;
  }

  if (!start) return null;
  if (start < today) start = today;
  nights = Math.min(nights || 1, 14);

  const stayNights = Array.from({ length: nights }, (_, i) => addDays(start, i));
  return { checkIn: start, checkOut: addDays(start, nights), nights, stayNights };
}
