export type WorkspaceId = "rovisys" | "personal";

export type Priority = "Baixa" | "Alta";

export type RecurrenceType =
  | "none"
  | "daily"
  | "weekdays"
  | "weekly"
  | "monthly"
  | "yearly";

export type RoviSysState =
  | "Novo"
  | "Em progresso"
  | "Feito"
  | "Não feito"
  | "Parcial"
  | "Adiado"
  | "Bloqueado";

export type PersonalState =
  | "Novo"
  | "Em progresso"
  | "Feito"
  | "Adiado"
  | "Backlog"
  | "Arquivado";

export type ItemState = RoviSysState | PersonalState;

export type RoviSysCategory =
  | "Task"
  | "Event"
  | "Reminder"
  | "Follow-up"
  | "Decision"
  | "Risk"
  | "Note"
  | "Issue"
  | "Waiting";

export type PersonalCategory =
  | "Task"
  | "Event"
  | "Reminder"
  | "Idea"
  | "Note"
  | "Music"
  | "Business"
  | "Health"
  | "Finance"
  | "Learning";

export type ItemCategory = RoviSysCategory | PersonalCategory;

export type ContainerType = "project" | "area";

export type ContainerItem = {
  id: string;
  workspaceId: WorkspaceId;
  type: ContainerType;
  name: string;
  order?: number;
};

export type Item = {
  id: string;
  workspaceId: WorkspaceId;
  containerId: string;
  title: string;
  description: string;
  category: ItemCategory;
  state: ItemState;
  createdAt: string;
  dueDate?: string;
  priority?: Priority;
  priorityOrder?: number;
  person?: string;
  dateText?: string;
  timeText?: string;
  dateISO?: string;
  recurrence?: RecurrenceType;
  stateUpdatedAt?: string;
  occurrenceStates?: Record<string, ItemState>;
  occurrenceStateUpdatedAt?: Record<string, string>;
};

export type WorkspaceConfig = {
  id: WorkspaceId;
  name: string;
  containerLabel: string;
  categories: ItemCategory[];
  states: ItemState[];
};
