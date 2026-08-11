import type { ItemCategory, ItemState, Priority, RecurrenceType } from "../types";

export type ManualTaskDraft = {
  title: string;
  description: string;
  category: ItemCategory;
  state: ItemState;
  priority: Priority;
  containerId: string;
  person: null;
  dateText: null;
  timeText: null;
  dateISO: null;
  recurrence: RecurrenceType;
};

export function createManualTaskDraft(
  rawText: string,
  containerId: string
): ManualTaskDraft {
  const description = rawText.trim();
  if (!description) {
    throw new Error("Escreve primeiro a tarefa que queres adicionar.");
  }

  const firstNonEmptyLine = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  const normalizedTitle = (firstNonEmptyLine ?? description).replace(/\s+/g, " ");
  const title =
    normalizedTitle.length > 70
      ? `${normalizedTitle.slice(0, 70).trimEnd()}...`
      : normalizedTitle;

  return {
    title,
    description,
    category: "Task",
    state: "Novo",
    priority: "Baixa",
    containerId,
    person: null,
    dateText: null,
    timeText: null,
    dateISO: null,
    recurrence: "none",
  };
}
