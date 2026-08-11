import type {
  ContainerItem,
  Item,
  ItemCategory,
  ItemState,
  Priority,
  RecurrenceType,
  WorkspaceId,
} from "../types";

export const BACKUP_SCHEMA_VERSION = 1;
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

export type OrganagerBackup = {
  app: "organager";
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  containers: ContainerItem[];
  items: Item[];
};

const workspaceIds: readonly WorkspaceId[] = ["rovisys", "personal"];
const priorities: readonly Priority[] = ["Baixa", "Alta"];
const recurrences: readonly RecurrenceType[] = [
  "none",
  "daily",
  "weekdays",
  "weekly",
  "monthly",
  "yearly",
];

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
  rovisys: [
    "Novo",
    "Em progresso",
    "Feito",
    "Não feito",
    "Parcial",
    "Adiado",
    "Bloqueado",
  ],
  personal: ["Novo", "Em progresso", "Feito", "Adiado", "Backlog", "Arquivado"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(
  record: Record<string, unknown>,
  field: string,
  context: string
) {
  const value = record[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${context}: ${field} inválido.`);
  }
  return value;
}

function optionalString(
  record: Record<string, unknown>,
  field: string,
  context: string
) {
  const value = record[field];
  if (value !== undefined && typeof value !== "string") {
    throw new Error(`${context}: ${field} inválido.`);
  }
}

function validateDateISO(value: string, context: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${context}: data inválida.`);
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`${context}: data inexistente.`);
  }
}

function validateStateMap(value: unknown, context: string, workspaceId: WorkspaceId) {
  if (value === undefined) return;
  if (!isRecord(value)) throw new Error(`${context} inválido.`);

  for (const [dateISO, state] of Object.entries(value)) {
    validateDateISO(dateISO, context);
    if (!statesByWorkspace[workspaceId].includes(state as ItemState)) {
      throw new Error(`${context}: estado inválido.`);
    }
  }
}

function validateTimestampMap(value: unknown, context: string) {
  if (value === undefined) return;
  if (!isRecord(value)) throw new Error(`${context} inválido.`);

  for (const [dateISO, timestamp] of Object.entries(value)) {
    validateDateISO(dateISO, context);
    if (typeof timestamp !== "string" || Number.isNaN(new Date(timestamp).getTime())) {
      throw new Error(`${context}: timestamp inválido.`);
    }
  }
}

function validateContainer(value: unknown, index: number): ContainerItem {
  const context = `Projeto/área ${index + 1}`;
  if (!isRecord(value)) throw new Error(`${context} inválido.`);

  const id = requireString(value, "id", context);
  const name = requireString(value, "name", context);
  const workspaceId = value.workspaceId;
  const type = value.type;

  if (!workspaceIds.includes(workspaceId as WorkspaceId)) {
    throw new Error(`${context}: workspaceId inválido.`);
  }
  if (type !== "project" && type !== "area") {
    throw new Error(`${context}: tipo inválido.`);
  }
  if (
    (workspaceId === "rovisys" && type !== "project") ||
    (workspaceId === "personal" && type !== "area")
  ) {
    throw new Error(`${context}: tipo incompatível com o espaço.`);
  }

  if (
    value.order !== undefined &&
    (!Number.isInteger(value.order) || (value.order as number) < 0)
  ) {
    throw new Error(`${context}: ordem inválida.`);
  }

  const container: ContainerItem = {
    id,
    name,
    workspaceId: workspaceId as WorkspaceId,
    type,
  };
  if (typeof value.order === "number") container.order = value.order;
  return container;
}

function validateItem(value: unknown, index: number): Item {
  const context = `Tarefa ${index + 1}`;
  if (!isRecord(value)) throw new Error(`${context} inválida.`);

  const workspaceId = value.workspaceId;
  if (!workspaceIds.includes(workspaceId as WorkspaceId)) {
    throw new Error(`${context}: workspaceId inválido.`);
  }
  const validWorkspace = workspaceId as WorkspaceId;

  const category = value.category;
  const state = value.state;
  if (!categoriesByWorkspace[validWorkspace].includes(category as ItemCategory)) {
    throw new Error(`${context}: categoria inválida.`);
  }
  if (!statesByWorkspace[validWorkspace].includes(state as ItemState)) {
    throw new Error(`${context}: estado inválido.`);
  }

  if (value.priority !== undefined && !priorities.includes(value.priority as Priority)) {
    throw new Error(`${context}: prioridade inválida.`);
  }
  if (
    value.priorityOrder !== undefined &&
    (!Number.isInteger(value.priorityOrder) || (value.priorityOrder as number) < 0)
  ) {
    throw new Error(`${context}: ordem de prioridade inválida.`);
  }
  if (
    value.recurrence !== undefined &&
    !recurrences.includes(value.recurrence as RecurrenceType)
  ) {
    throw new Error(`${context}: recorrência inválida.`);
  }

  for (const field of [
    "dueDate",
    "person",
    "dateText",
    "timeText",
    "dateISO",
    "stateUpdatedAt",
  ]) {
    optionalString(value, field, context);
  }

  if (typeof value.dateISO === "string") {
    validateDateISO(value.dateISO, context);
  }
  if (
    typeof value.timeText === "string" &&
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.timeText)
  ) {
    throw new Error(`${context}: hora inválida.`);
  }
  if (
    typeof value.stateUpdatedAt === "string" &&
    Number.isNaN(new Date(value.stateUpdatedAt).getTime())
  ) {
    throw new Error(`${context}: stateUpdatedAt inválido.`);
  }

  validateStateMap(value.occurrenceStates, `${context}: occurrenceStates`, validWorkspace);
  validateTimestampMap(
    value.occurrenceStateUpdatedAt,
    `${context}: occurrenceStateUpdatedAt`
  );

  const item: Item = {
    id: requireString(value, "id", context),
    workspaceId: validWorkspace,
    containerId: requireString(value, "containerId", context),
    title: requireString(value, "title", context),
    description:
      typeof value.description === "string"
        ? value.description
        : (() => {
            throw new Error(`${context}: description inválida.`);
          })(),
    category: category as ItemCategory,
    state: state as ItemState,
    createdAt: requireString(value, "createdAt", context),
  };

  if (typeof value.dueDate === "string") item.dueDate = value.dueDate;
  if (value.priority !== undefined) item.priority = value.priority as Priority;
  if (typeof value.priorityOrder === "number") {
    item.priorityOrder = value.priorityOrder;
  }
  if (typeof value.person === "string") item.person = value.person;
  if (typeof value.dateText === "string") item.dateText = value.dateText;
  if (typeof value.timeText === "string") item.timeText = value.timeText;
  if (typeof value.dateISO === "string") item.dateISO = value.dateISO;
  if (value.recurrence !== undefined) {
    item.recurrence = value.recurrence as RecurrenceType;
  }
  if (typeof value.stateUpdatedAt === "string") {
    item.stateUpdatedAt = value.stateUpdatedAt;
  }
  if (isRecord(value.occurrenceStates)) {
    item.occurrenceStates = value.occurrenceStates as Record<string, ItemState>;
  }
  if (isRecord(value.occurrenceStateUpdatedAt)) {
    item.occurrenceStateUpdatedAt = value.occurrenceStateUpdatedAt as Record<
      string,
      string
    >;
  }

  return item;
}

export function validateBackup(value: unknown): OrganagerBackup {
  if (!isRecord(value)) throw new Error("O ficheiro não contém um backup válido.");
  if (value.app !== "organager") throw new Error("Este ficheiro não é do Organager.");
  if (value.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error("A versão deste backup não é suportada.");
  }
  if (
    typeof value.exportedAt !== "string" ||
    Number.isNaN(new Date(value.exportedAt).getTime())
  ) {
    throw new Error("A data de exportação do backup é inválida.");
  }
  if (!Array.isArray(value.containers) || !Array.isArray(value.items)) {
    throw new Error("O backup não contém projetos e tarefas válidos.");
  }
  if (value.containers.length > 10_000 || value.items.length > 100_000) {
    throw new Error("O backup excede os limites suportados.");
  }

  const containers = value.containers.map(validateContainer);
  const items = value.items.map(validateItem);
  const containerIds = new Set<string>();
  for (const container of containers) {
    if (containerIds.has(container.id)) {
      throw new Error(`Projeto/área duplicado: ${container.id}.`);
    }
    containerIds.add(container.id);
  }

  const itemIds = new Set<string>();
  const containersById = new Map(containers.map((container) => [container.id, container]));
  for (const item of items) {
    if (itemIds.has(item.id)) throw new Error(`Tarefa duplicada: ${item.id}.`);
    itemIds.add(item.id);

    const container = containersById.get(item.containerId);
    if (!container || container.workspaceId !== item.workspaceId) {
      throw new Error(`A tarefa “${item.title}” aponta para um projeto inválido.`);
    }
  }

  for (const workspaceId of workspaceIds) {
    const unassigned = containersById.get(`unassigned-${workspaceId}`);
    if (!unassigned || unassigned.workspaceId !== workspaceId) {
      throw new Error(`Falta o projeto de segurança do espaço ${workspaceId}.`);
    }
  }

  return {
    app: "organager",
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: value.exportedAt,
    containers,
    items,
  };
}

export function createBackup(
  containers: ContainerItem[],
  items: Item[],
  exportedAt = new Date()
): OrganagerBackup {
  return validateBackup({
    app: "organager",
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: exportedAt.toISOString(),
    containers,
    items,
  });
}

export function createBackupJSON(containers: ContainerItem[], items: Item[]) {
  return JSON.stringify(createBackup(containers, items), null, 2);
}

function utf8ByteLength(value: string) {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    bytes +=
      codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}

export function parseBackupJSON(raw: string) {
  if (utf8ByteLength(raw) > MAX_BACKUP_BYTES) {
    throw new Error("O ficheiro de backup excede 5 MB.");
  }

  try {
    return validateBackup(JSON.parse(raw) as unknown);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("O ficheiro não contém JSON válido.");
    }
    throw error;
  }
}

export function backupFileName(date = new Date()) {
  const timestamp = date.toISOString().replace(/[:.]/g, "-");
  return `organager-backup-${timestamp}.json`;
}
