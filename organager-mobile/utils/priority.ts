import type { Item } from "../types";

function itemOrder(item: Item) {
  return typeof item.priorityOrder === "number"
    ? item.priorityOrder
    : Number.MAX_SAFE_INTEGER;
}

function comparePriority(itemA: Item, itemB: Item) {
  const aIsPriority = itemA.priority === "Alta";
  const bIsPriority = itemB.priority === "Alta";

  if (aIsPriority !== bIsPriority) return aIsPriority ? -1 : 1;
  const rankDifference = itemOrder(itemA) - itemOrder(itemB);
  if (rankDifference !== 0) return rankDifference;

  return 0;
}

export function compareActiveItems(itemA: Item, itemB: Item) {
  const priorityDifference = comparePriority(itemA, itemB);
  if (priorityDifference !== 0) return priorityDifference;

  const dateA = itemA.dateISO ?? "9999-12-31";
  const dateB = itemB.dateISO ?? "9999-12-31";
  if (dateA !== dateB) return dateA.localeCompare(dateB);

  const timeDifference = String(itemA.timeText ?? "99:99").localeCompare(
    String(itemB.timeText ?? "99:99")
  );
  if (timeDifference !== 0) return timeDifference;

  return itemA.title.localeCompare(itemB.title, "pt-PT");
}

export function compareCalendarItems(itemA: Item, itemB: Item) {
  const priorityDifference = comparePriority(itemA, itemB);
  if (priorityDifference !== 0) return priorityDifference;

  const timeDifference = String(itemA.timeText ?? "99:99").localeCompare(
    String(itemB.timeText ?? "99:99")
  );
  if (timeDifference !== 0) return timeDifference;

  return itemA.title.localeCompare(itemB.title, "pt-PT");
}

export function movePriorityId(
  globallyOrderedIds: string[],
  visibleOrderedIds: string[],
  itemId: string,
  direction: "up" | "down"
) {
  const visibleIndex = visibleOrderedIds.indexOf(itemId);
  const adjacentVisibleIndex = direction === "up" ? visibleIndex - 1 : visibleIndex + 1;

  if (
    visibleIndex < 0 ||
    adjacentVisibleIndex < 0 ||
    adjacentVisibleIndex >= visibleOrderedIds.length
  ) {
    return globallyOrderedIds.slice();
  }

  const adjacentId = visibleOrderedIds[adjacentVisibleIndex];
  const itemGlobalIndex = globallyOrderedIds.indexOf(itemId);
  const adjacentGlobalIndex = globallyOrderedIds.indexOf(adjacentId);
  if (itemGlobalIndex < 0 || adjacentGlobalIndex < 0) {
    return globallyOrderedIds.slice();
  }

  const next = globallyOrderedIds.slice();
  [next[itemGlobalIndex], next[adjacentGlobalIndex]] = [
    next[adjacentGlobalIndex],
    next[itemGlobalIndex],
  ];
  return next;
}
