import { ItemCategory, ItemState, Priority, WorkspaceId } from "../types";
import { backendUrl } from "./backend";

export type AnalyzePointInput = {
  workspaceId: WorkspaceId;
  rawText: string;
  containers: { id: string; name: string }[];
};

export type AnalyzePointResult = {
  title: string;
  cleanedText: string;
  category: ItemCategory;
  containerId: string | null;
  containerName: string | null;
  suggestedState: ItemState;
  confidence: number;
  priority: Priority;
  person: string | null;
  dateText: string | null;
  timeText: string | null;
  dateISO: string | null;
};

const REQUEST_TIMEOUT_MS = 10_000;

const categoriesByWorkspace: Record<WorkspaceId, readonly ItemCategory[]> = {
  rovisys: [
    "Task",
    "Event",
    "Reminder",
    "Follow-up",
    "Decision",
    "Risk",
    "Note",
    "Issue",
    "Waiting",
  ],
  personal: [
    "Task",
    "Event",
    "Reminder",
    "Idea",
    "Note",
    "Music",
    "Business",
    "Health",
    "Finance",
    "Learning",
  ],
};

const statesByWorkspace: Record<WorkspaceId, readonly ItemState[]> = {
  rovisys: ["Novo", "Em progresso", "Feito", "Não feito", "Parcial", "Adiado", "Bloqueado"],
  personal: ["Novo", "Em progresso", "Feito", "Adiado", "Backlog", "Arquivado"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidDateISO(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function readNullableString(value: unknown, field: string) {
  if (value === null) return null;
  if (typeof value === "string") return value;
  throw new Error(`Resposta inválida da API: ${field}`);
}

function parseAnalyzePointResult(
  value: unknown,
  input: AnalyzePointInput
): AnalyzePointResult {
  if (!isRecord(value)) {
    throw new Error("Resposta inválida da API");
  }

  const { workspaceId } = input;
  const category = value.category;
  const suggestedState = value.suggestedState;
  const priority = value.priority;
  const confidence = value.confidence;
  const containerId = readNullableString(value.containerId, "containerId");
  const containerName = readNullableString(value.containerName, "containerName");
  const person = readNullableString(value.person, "person");
  const dateText = readNullableString(value.dateText, "dateText");
  const timeText = readNullableString(value.timeText, "timeText");
  const dateISO = readNullableString(value.dateISO, "dateISO");

  if (typeof value.title !== "string" || typeof value.cleanedText !== "string") {
    throw new Error("Resposta inválida da API: texto");
  }

  if (!categoriesByWorkspace[workspaceId].includes(category as ItemCategory)) {
    throw new Error("Resposta inválida da API: categoria");
  }

  if (!statesByWorkspace[workspaceId].includes(suggestedState as ItemState)) {
    throw new Error("Resposta inválida da API: estado");
  }

  if (priority !== "Baixa" && priority !== "Alta") {
    throw new Error("Resposta inválida da API: prioridade");
  }

  if (
    typeof confidence !== "number" ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    throw new Error("Resposta inválida da API: confiança");
  }

  if (containerId && !input.containers.some((container) => container.id === containerId)) {
    throw new Error("Resposta inválida da API: container desconhecido");
  }

  if (timeText && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(timeText)) {
    throw new Error("Resposta inválida da API: hora");
  }

  if (dateISO && !isValidDateISO(dateISO)) {
    throw new Error("Resposta inválida da API: data");
  }

  return {
    title: value.title,
    cleanedText: value.cleanedText,
    category: category as ItemCategory,
    containerId,
    containerName,
    suggestedState: suggestedState as ItemState,
    confidence,
    priority,
    person,
    dateText,
    timeText,
    dateISO,
  };
}

export async function analyzePoint(
  input: AnalyzePointInput,
  apiBaseUrl: string
): Promise<AnalyzePointResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(backendUrl(apiBaseUrl, "/analyze-point"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Falha ao analisar ponto (${response.status})`);
    }

    const data: unknown = await response.json();
    return parseAnalyzePointResult(data, input);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("A API demorou mais de 10 segundos a responder");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
