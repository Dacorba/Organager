import type { Item } from "../types";

export function formatDateISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayISO() {
  return formatDateISO(new Date());
}

function parseISODate(dateISO?: string) {
  if (!dateISO) return null;

  const [year, month, day] = dateISO.split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

export function itemOccursOnDate(
  item: Item,
  dateISO: string,
  currentDateISO = todayISO()
) {
  const recurrence = item.recurrence ?? "none";

  if (!item.dateISO) {
    return recurrence === "none" && dateISO === currentDateISO;
  }

  if (recurrence === "none") {
    if (item.dateISO < currentDateISO) return dateISO === currentDateISO;
    return item.dateISO === dateISO;
  }

  if (dateISO < item.dateISO) return false;

  const startDate = parseISODate(item.dateISO);
  const targetDate = parseISODate(dateISO);
  if (!startDate || !targetDate) return false;

  if (recurrence === "daily") return true;

  if (recurrence === "weekdays") {
    const day = targetDate.getDay();
    return day >= 1 && day <= 5;
  }

  if (recurrence === "weekly") {
    return startDate.getDay() === targetDate.getDay();
  }

  if (recurrence === "monthly") {
    return startDate.getDate() === targetDate.getDate();
  }

  if (recurrence === "yearly") {
    return (
      startDate.getMonth() === targetDate.getMonth() &&
      startDate.getDate() === targetDate.getDate()
    );
  }

  return false;
}

export function isOccurrenceFinished(item: Item, dateISO: string) {
  const state = item.occurrenceStates?.[dateISO];
  return state === "Feito" || state === "Arquivado";
}

function addDaysISO(dateISO: string, days: number) {
  const date = parseISODate(dateISO);
  if (!date) return dateISO;
  date.setDate(date.getDate() + days);
  return formatDateISO(date);
}

export function isItemVisibleInActiveList(
  item: Item,
  currentDateISO = todayISO()
) {
  if ((item.recurrence ?? "none") !== "yearly") return true;
  if (!item.dateISO) return false;

  const occursToday = itemOccursOnDate(item, currentDateISO, currentDateISO);
  if (occursToday && !isOccurrenceFinished(item, currentDateISO)) return true;

  const tomorrowISO = addDaysISO(currentDateISO, 1);
  return itemOccursOnDate(item, tomorrowISO, currentDateISO);
}

export function isBirthdayItem(item: Item) {
  return (item.recurrence ?? "none") === "yearly" && Boolean(item.dateISO);
}

export function nextBirthdayOccurrenceISO(
  item: Item,
  currentDateISO = todayISO()
) {
  if (!isBirthdayItem(item) || !item.dateISO) return null;

  const [, month, day] = item.dateISO.split("-");
  const currentYear = Number(currentDateISO.slice(0, 4));

  for (let year = currentYear; year <= currentYear + 8; year += 1) {
    const candidate = `${year}-${month}-${day}`;
    const parsedCandidate = parseISODate(candidate);
    if (!parsedCandidate || formatDateISO(parsedCandidate) !== candidate) continue;
    if (candidate < currentDateISO || candidate < item.dateISO) continue;
    if (isOccurrenceFinished(item, candidate)) continue;
    return candidate;
  }

  return null;
}

export function daysBetweenISO(startISO: string, endISO: string) {
  const start = parseISODate(startISO);
  const end = parseISODate(endISO);
  if (!start || !end) return null;

  const startUTC = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUTC - startUTC) / 86_400_000);
}
