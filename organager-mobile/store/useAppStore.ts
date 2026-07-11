import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  ContainerItem,
  Item,
  ItemCategory,
  ItemState,
  Priority,
  RecurrenceType,
  WorkspaceConfig,
  WorkspaceId,
} from "../types";
import { classifyItem } from "../utils/classifier";

const uid = () => Math.random().toString(36).slice(2, 10);

const workspaceConfigs: WorkspaceConfig[] = [
  {
    id: "rovisys",
    name: "Trabalho",
    containerLabel: "Projetos",
    categories: [
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
    states: ["Novo", "Em progresso", "Feito", "Parcial", "Adiado", "Bloqueado"],
  },
  {
    id: "personal",
    name: "Pessoal",
    containerLabel: "Áreas",
    categories: [
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
    states: ["Novo", "Em progresso", "Feito", "Adiado", "Backlog", "Arquivado"],
  },
];

type AddAnalyzedPointPayload = {
  workspaceId: WorkspaceId;
  containerId: string;
  title: string;
  description: string;
  category: ItemCategory;
  state: ItemState;
  priority?: Priority;
  person?: string | null;
  dateText?: string | null;
  timeText?: string | null;
  dateISO?: string | null;
  recurrence?: RecurrenceType;
};

type AppStore = {
  workspaces: WorkspaceConfig[];
  containers: ContainerItem[];
  items: Item[];
  
  addContainer: (workspaceId: WorkspaceId, name: string) => void;
  renameContainer: (containerId: string, name: string) => void;
  removeContainer: (containerId: string) => void;
  removeItem: (itemId: string) => void;

  addPoint: (workspaceId: WorkspaceId, containerId: string, text: string) => void;
  addAnalyzedPoint: (payload: AddAnalyzedPointPayload) => void;
  updateAnalyzedPoint: (itemId: string, payload: AddAnalyzedPointPayload) => void;

  updateItemState: (itemId: string, state: ItemState, occurrenceDate?: string) => void;

  getWorkspace: (workspaceId: WorkspaceId) => WorkspaceConfig | undefined;
  getContainersByWorkspace: (workspaceId: WorkspaceId) => ContainerItem[];
  getContainerById: (containerId: string) => ContainerItem | undefined;
  getItemById: (itemId: string) => Item | undefined;

  getActiveItemsGlobal: (workspaceId: WorkspaceId) => Item[];
  getBacklogItemsGlobal: (workspaceId: WorkspaceId) => Item[];
  getHistoryItemsGlobal: (workspaceId: WorkspaceId) => Item[];
  togglePriority: (itemId: string) => void;
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
  workspaces: workspaceConfigs,

  containers: [
    { id: "proj-1", workspaceId: "rovisys", type: "project", name: "AMS-01" },
    { id: "proj-2", workspaceId: "rovisys", type: "project", name: "DC Utrecht Expansion" },
    { id: "area-1", workspaceId: "personal", type: "area", name: "Music" },
    { id: "area-2", workspaceId: "personal", type: "area", name: "Business" },
    { id: "area-3", workspaceId: "personal", type: "area", name: "Website" },
    { id: "unassigned-rovisys", workspaceId: "rovisys", type: "project", name: "Sem projeto" },
    { id: "unassigned-personal", workspaceId: "personal", type: "area", name: "Sem projeto" },
  ],

  items: [
    {
      id: "1",
      workspaceId: "rovisys",
      containerId: "proj-1",
      title: "Confirmar estado do painel B com João",
      description: "Follow-up para validar se o painel B ficou pronto para teste amanhã às 9.",
      category: "Follow-up",
      state: "Em progresso",
      createdAt: "10/03/2026, 09:10",
      dueDate: "11/03/2026 09:00",
      priority: "Alta",
      person: "João",
      dateText: "amanhã",
      timeText: "09:00",
    },
    {
      id: "2",
      workspaceId: "rovisys",
      containerId: "proj-1",
      title: "Atraso do fornecedor pode escorregar o teste",
      description: "Se não houver resposta hoje, o integrated test pode deslizar.",
      category: "Risk",
      state: "Novo",
      createdAt: "10/03/2026, 11:40",
      priority: "Alta",
      dateText: "hoje",
    },
  ],

  addContainer: (workspaceId, name) =>
    set((state) => ({
      containers: [
        ...state.containers,
        {
          id: uid(),
          workspaceId,
          type: workspaceId === "rovisys" ? "project" : "area",
          name,
        },
      ],
    })),

  renameContainer: (containerId, name) =>
    set((state) => ({
      containers: state.containers.map((container) =>
        container.id === containerId ? { ...container, name } : container
      ),
    })),

  removeContainer: (containerId) =>
    set((state) => {
      const container = state.containers.find((entry) => entry.id === containerId);
      if (!container || container.id.startsWith("unassigned-")) return state;

      const unassignedId = `unassigned-${container.workspaceId}`;
      return {
        containers: state.containers.filter((entry) => entry.id !== containerId),
        items: state.items.map((item) =>
          item.containerId === containerId
            ? { ...item, containerId: unassignedId }
            : item
        ),
      };
    }),

    removeItem: (itemId) =>
      set((state) => ({
        items: state.items.filter((item) => item.id !== itemId),
      })),

  addPoint: (workspaceId, containerId, text) => {
    const category = classifyItem(text, workspaceId);
    const title = text.length > 70 ? `${text.slice(0, 70)}...` : text;
    const defaultState: ItemState =
      workspaceId === "personal" && category === "Idea" ? "Backlog" : "Novo";

    set((state) => ({
      items: [
        {
          id: uid(),
          workspaceId,
          containerId,
          title,
          description: text,
          category,
          state: defaultState,
          createdAt: new Date().toLocaleString("pt-PT"),
          priority: "Baixa",
          recurrence: "none",
        },
        ...state.items,
      ],
    }));
  },

  addAnalyzedPoint: (payload) =>
    set((state) => ({
      items: [
        {
          id: uid(),
          workspaceId: payload.workspaceId,
          containerId: payload.containerId,
          title: payload.title,
          description: payload.description,
          category: payload.category,
          state: payload.state,
          createdAt: new Date().toLocaleString("pt-PT"),
          priority: payload.priority ?? "Baixa",
          person: payload.person ?? undefined,
          dateText: payload.dateText ?? undefined,
          timeText: payload.timeText ?? undefined,
          dateISO: payload.dateISO ?? undefined,
          recurrence: payload.recurrence ?? "none",
        },
        ...state.items,
      ],
    })),

  updateAnalyzedPoint: (itemId, payload) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              workspaceId: payload.workspaceId,
              containerId: payload.containerId,
              title: payload.title,
              description: payload.description,
              category: payload.category,
              state: payload.state,
              priority: payload.priority ?? "Baixa",
              person: payload.person ?? undefined,
              dateText: payload.dateText ?? undefined,
              timeText: payload.timeText ?? undefined,
              dateISO: payload.dateISO ?? undefined,
              recurrence: payload.recurrence ?? "none",
              stateUpdatedAt:
                item.state === payload.state
                  ? item.stateUpdatedAt
                  : new Date().toISOString(),
              occurrenceStates:
                payload.recurrence === "none" ? undefined : item.occurrenceStates,
              occurrenceStateUpdatedAt:
                payload.recurrence === "none"
                  ? undefined
                  : item.occurrenceStateUpdatedAt,
            }
          : item
      ),
    })),

  updateItemState: (itemId, stateValue, occurrenceDate) =>
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== itemId) return item;

        const updatedAt = new Date().toISOString();
        const isRecurring = (item.recurrence ?? "none") !== "none";

        if (isRecurring && occurrenceDate) {
          return {
            ...item,
            occurrenceStates: {
              ...item.occurrenceStates,
              [occurrenceDate]: stateValue,
            },
            occurrenceStateUpdatedAt: {
              ...item.occurrenceStateUpdatedAt,
              [occurrenceDate]: updatedAt,
            },
          };
        }

        return {
          ...item,
          state: stateValue,
          stateUpdatedAt: updatedAt,
        };
      }),
    })),

    togglePriority: (itemId) =>
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== itemId) return item;

        return {
          ...item,
          priority:
            item.priority === "Alta" ? "Baixa" : "Alta",
        };
      }),
    })),

  getWorkspace: (workspaceId) =>
    get().workspaces.find((w) => w.id === workspaceId),

  getContainersByWorkspace: (workspaceId) =>
    get().containers.filter((c) => c.workspaceId === workspaceId),

  getContainerById: (containerId) =>
    get().containers.find((c) => c.id === containerId),

  getItemById: (itemId) =>
    get().items.find((i) => i.id === itemId),

  getActiveItemsGlobal: (workspaceId) => {
    const excluded =
      workspaceId === "personal"
        ? ["Feito", "Arquivado", "Backlog"]
        : ["Feito"];

    return get().items.filter(
      (item) => item.workspaceId === workspaceId && !excluded.includes(item.state)
    );
  },

  getBacklogItemsGlobal: (workspaceId) =>
    get().items.filter(
      (item) => item.workspaceId === workspaceId && item.state === "Backlog"
    ),

  getHistoryItemsGlobal: (workspaceId) =>
    get().items.filter(
      (item) =>
        item.workspaceId === workspaceId &&
        ["Feito", "Arquivado"].includes(item.state)
    ),
    }),
    {
      name: "organager-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        containers: state.containers,
        items: state.items,
      }),
    }
  )
);
