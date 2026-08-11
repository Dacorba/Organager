import type { Item } from "../types";
import {
  formatDateISO,
  isOccurrenceFinished,
  itemOccursOnDate,
} from "./calendar.ts";

export type PersonalDailySummary = {
  completed: Item[];
  pending: Item[];
  plannedCount: number;
  completionPercentage: number;
};

export function timestampIsOnDate(
  timestamp: string | undefined,
  dateISO: string
) {
  if (!timestamp) return false;

  const date = new Date(timestamp);
  return !Number.isNaN(date.getTime()) && formatDateISO(date) === dateISO;
}

function wasCompletedOnDate(item: Item, dateISO: string) {
  const recurrence = item.recurrence ?? "none";

  if (recurrence !== "none") {
    return (
      item.occurrenceStates?.[dateISO] === "Feito" &&
      timestampIsOnDate(item.occurrenceStateUpdatedAt?.[dateISO], dateISO)
    );
  }

  return (
    item.state === "Feito" && timestampIsOnDate(item.stateUpdatedAt, dateISO)
  );
}

export function getPersonalDailySummary(
  items: Item[],
  dateISO: string
): PersonalDailySummary {
  const personalItems = items.filter((item) => item.workspaceId === "personal");

  const completed = personalItems.filter((item) =>
    wasCompletedOnDate(item, dateISO)
  );

  const pending = personalItems.filter((item) => {
    if (["Feito", "Arquivado", "Backlog"].includes(item.state)) return false;
    if (!itemOccursOnDate(item, dateISO, dateISO)) return false;
    return !isOccurrenceFinished(item, dateISO);
  });

  const plannedCount = completed.length + pending.length;
  const completionPercentage = plannedCount
    ? Math.round((completed.length / plannedCount) * 100)
    : 0;

  return {
    completed,
    pending,
    plannedCount,
    completionPercentage,
  };
}
