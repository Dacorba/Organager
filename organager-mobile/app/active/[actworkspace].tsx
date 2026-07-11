import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { useAppStore } from "../../store/useAppStore";
import { Item, RecurrenceType, WorkspaceId } from "../../types";

type ViewMode = "active" | "calendar";

function formatDateISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayISO() {
  return formatDateISO(new Date());
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("pt-PT", {
    month: "long",
    year: "numeric",
  });
}

function getCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days: (Date | null)[] = [];
  const mondayBasedStart = (firstDay.getDay() + 6) % 7;

  for (let i = 0; i < mondayBasedStart; i++) days.push(null);

  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day));
  }

  return days;
}

function parseISODate(dateISO?: string) {
  if (!dateISO) return null;

  const [year, month, day] = dateISO.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function recurrenceLabel(recurrence?: RecurrenceType) {
  switch (recurrence ?? "none") {
    case "daily":
      return "🔁 Todos os dias";
    case "weekdays":
      return "🔁 Dias úteis";
    case "weekly":
      return "🔁 Semanal";
    case "monthly":
      return "🔁 Mensal";
    case "yearly":
      return "🎂 Anual";
    default:
      return undefined;
  }
}

function itemOccursOnDate(item: Item, dateISO: string) {
  const recurrence = item.recurrence ?? "none";
  const today = todayISO();

  // Uma tarefa aberta aparece apenas hoje. À meia-noite, continua pendente
  // e passa automaticamente para o novo dia, sem preencher datas futuras.
  if (!item.dateISO) {
    return recurrence === "none" && dateISO === today;
  }

  // Tarefas pontuais atrasadas também transitam para hoje. Tarefas futuras
  // permanecem exclusivamente na data marcada.
  if (recurrence === "none") {
    if (item.dateISO < today) return dateISO === today;
    return item.dateISO === dateISO;
  }

  // Recorrência só começa a partir da data inicial
  if (dateISO < item.dateISO) {
    return false;
  }

  const startDate = parseISODate(item.dateISO);
  const targetDate = parseISODate(dateISO);

  if (!startDate || !targetDate) return false;

  if (recurrence === "daily") {
    return true;
  }

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

function isOccurrenceFinished(item: Item, dateISO: string) {
  const state = item.occurrenceStates?.[dateISO];
  return state === "Feito" || state === "Arquivado";
}

function SelectPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: active ? "#0f172a" : "#fff",
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 10,
      }}
    >
      <Text
        style={{
          color: active ? "#fff" : "#334155",
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Badge({ label }: { label?: string }) {
  if (!label) return null;

  return (
    <View
      style={{
        backgroundColor: "#e2e8f0",
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "600", color: "#334155" }}>
        {label}
      </Text>
    </View>
  );
}

function ItemCard({
    item,
    onOpen,
    onTogglePriority,
  }: {
    item: Item;
    onOpen: (id: string) => void;
    onTogglePriority: (id: string) => void;
  }) {
  return (
    <Pressable
      onPress={() => onOpen(item.id)}
      style={{
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 18,
        padding: 14,
        gap: 8,
        backgroundColor: "#fff",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: "#334155",
            flex: 1,
          }}
        >
          {item.timeText ? `${item.timeText} · ` : ""}
          {item.title}
        </Text>

        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onTogglePriority(item.id);
          }}
        >
          <Text
            style={{
              fontSize: 30,
              color: item.priority === "Alta" ? "#ef4444" : "#1f2937",
              textShadowColor: item.priority === "Alta" ? "#ef4444" : "transparent",
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: item.priority === "Alta" ? 8 : 0,
            }}
          >
            ▲
          </Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        <Badge label={item.category} />
        <Badge label={item.state === "Não feito" ? "Novo" : item.state} />
        <Badge label={item.dateISO ? item.dateText ?? item.dateISO : "Aberta"} />
        <Badge label={recurrenceLabel(item.recurrence)} />
        <Badge label={item.person ? `👤 ${item.person}` : undefined} />
      </View>
    </Pressable>
  );
}

function SectionCard({
  title,
  items,
  onOpen,
  onTogglePriority,
  occurrenceDate,
}: {
  title: string;
  items: Item[];
  onOpen: (id: string, occurrenceDate?: string) => void;
  onTogglePriority: (id: string) => void;
  occurrenceDate?: string;
}) {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        padding: 16,
        gap: 12,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>
        {title}
      </Text>

      {items.map((item) => {
        const occurrenceState = occurrenceDate
          ? item.occurrenceStates?.[occurrenceDate]
          : undefined;
        const displayedItem = occurrenceState
          ? { ...item, state: occurrenceState }
          : item;

        return (
          <ItemCard
            key={item.id}
            item={displayedItem}
            onOpen={(id) => onOpen(id, occurrenceDate)}
            onTogglePriority={onTogglePriority}
          />
        );
      })}
    </View>
  );
}

export default function ActiveScreen() {
  const params = useLocalSearchParams<{
    actworkspace?: WorkspaceId;
    workspace?: WorkspaceId;
    containerId?: string;
  }>();

  const { containerId } = params;
  const workspaceId = (params.actworkspace ?? params.workspace ?? "rovisys") as WorkspaceId;
  const workspaces = useAppStore((s) => s.workspaces);
  const allContainers = useAppStore((s) => s.containers);
  const items = useAppStore((s) => s.items);
  const togglePriority = useAppStore((s) => s.togglePriority);
  const [containerFilter, setContainerFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [visibleMonth, setVisibleMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const currentWorkspace = useMemo(
    () => workspaces.find((w) => w.id === workspaceId),
    [workspaces, workspaceId]
  );

  const containers = useMemo(
    () => allContainers.filter((c) => c.workspaceId === workspaceId),
    [allContainers, workspaceId]
  );

  useEffect(() => {
    if (typeof containerId === "string" && containerId.length > 0) {
      setContainerFilter(containerId);
    }
  }, [containerId]);

  const activeItems = useMemo(() => {
    const excluded =
      workspaceId === "personal"
        ? ["Feito", "Arquivado", "Backlog"]
        : ["Feito"];

    return items.filter(
      (item) =>
        item.workspaceId === workspaceId &&
        !excluded.includes(item.state)
    );
  }, [items, workspaceId]);

  const filteredByContainer = useMemo(() => {
    return activeItems.filter(
      (item) => containerFilter === "all" || item.containerId === containerFilter
    );
  }, [activeItems, containerFilter]);

  const activeListItems = useMemo(() => {
    return filteredByContainer
      .slice()
      .sort((a, b) => {
        const aPriority = a.priority === "Alta" ? 1 : 0;
        const bPriority = b.priority === "Alta" ? 1 : 0;

        if (aPriority !== bPriority) return bPriority - aPriority;

        const aDate = a.dateISO ?? "9999-12-31";
        const bDate = b.dateISO ?? "9999-12-31";

        if (aDate !== bDate) return aDate.localeCompare(bDate);

        return String(a.timeText ?? "99:99").localeCompare(
          String(b.timeText ?? "99:99")
        );
      });
  }, [filteredByContainer]);

  const priorityItems = useMemo(() => {
    return activeListItems.filter((item) => item.priority === "Alta");
  }, [activeListItems]);

  const normalItems = useMemo(() => {
    return activeListItems.filter((item) => item.priority !== "Alta");
  }, [activeListItems]);

  const calendarDays = useMemo(
    () => getCalendarDays(visibleMonth),
    [visibleMonth]
  );

  const selectedDateItems = useMemo(() => {
    return filteredByContainer
      .filter(
        (item) =>
          itemOccursOnDate(item, selectedDate) &&
          !isOccurrenceFinished(item, selectedDate)
      )
      .sort((a, b) =>
        String(a.timeText ?? "99:99").localeCompare(
          String(b.timeText ?? "99:99")
        )
      );
  }, [filteredByContainer, selectedDate]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, Item[]>();

    calendarDays.forEach((date) => {
      if (!date) return;

      const key = formatDateISO(date);
      const dayItems = filteredByContainer.filter(
        (item) => itemOccursOnDate(item, key) && !isOccurrenceFinished(item, key)
      );

      if (dayItems.length > 0) {
        map.set(key, dayItems);
      }
    });

    return map;
  }, [calendarDays, filteredByContainer]);

  function changeMonth(offset: number) {
    setVisibleMonth((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + offset);
      return next;
    });
  }

  const openItem = (id: string, occurrenceDate?: string) =>
    router.push({
      pathname: "/detail/[id]",
      params: occurrenceDate ? { id, occurrenceDate } : { id },
    });

  if (!currentWorkspace) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Workspace não encontrado</Text>
        <Text>workspaceId: {String(workspaceId)}</Text>
        <Text>workspaces: {JSON.stringify(workspaces)}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text style={{ fontSize: 30, fontWeight: "700", color: "#0f172a" }}>
          Lista ativa — {currentWorkspace.name}
        </Text>

        <View style={{ paddingBottom: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize: 18 }}>← Voltar</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <SelectPill
            label="Lista ativa"
            active={viewMode === "active"}
            onPress={() => setViewMode("active")}
          />
          <SelectPill
            label="Calendário"
            active={viewMode === "calendar"}
            onPress={() => setViewMode("calendar")}
          />
        </View>

        <View style={{ gap: 10 }}>
          <Text style={{ fontWeight: "700", color: "#0f172a" }}>
            {workspaceId === "rovisys" ? "Projetos" : "Áreas"}
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <SelectPill
                label="Todos"
                active={containerFilter === "all"}
                onPress={() => setContainerFilter("all")}
              />

              {containers.map((container) => (
                <SelectPill
                  key={container.id}
                  label={container.name}
                  active={containerFilter === container.id}
                  onPress={() => setContainerFilter(container.id)}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        {viewMode === "calendar" ? (
          <View style={{ gap: 16 }}>
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 22,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                padding: 16,
                gap: 14,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Pressable onPress={() => changeMonth(-1)}>
                  <Text style={{ fontSize: 28, fontWeight: "700" }}>‹</Text>
                </Pressable>

                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: "#0f172a",
                    textTransform: "capitalize",
                  }}
                >
                  {monthLabel(visibleMonth)}
                </Text>

                <Pressable onPress={() => changeMonth(1)}>
                  <Text style={{ fontSize: 28, fontWeight: "700" }}>›</Text>
                </Pressable>
              </View>

              <View style={{ flexDirection: "row" }}>
                {["S", "T", "Q", "Q", "S", "S", "D"].map((day, index) => (
                  <Text
                    key={`${day}-${index}`}
                    style={{
                      width: `${100 / 7}%`,
                      textAlign: "center",
                      fontWeight: "700",
                      color: "#64748b",
                    }}
                  >
                    {day}
                  </Text>
                ))}
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {calendarDays.map((date, index) => {
                  if (!date) {
                    return (
                      <View
                        key={`empty-${index}`}
                        style={{ width: `${100 / 7}%`, height: 54 }}
                      />
                    );
                  }

                  const key = formatDateISO(date);
                  const dayItems = itemsByDate.get(key) ?? [];
                  const isSelected = selectedDate === key;
                  const isToday = todayISO() === key;

                  return (
                    <Pressable
                      key={key}
                      onPress={() => setSelectedDate(key)}
                      style={{
                        width: `${100 / 7}%`,
                        height: 54,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isSelected
                            ? "#0f172a"
                            : isToday
                            ? "#e2e8f0"
                            : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            color: isSelected ? "#fff" : "#0f172a",
                            fontWeight: isSelected || isToday ? "700" : "500",
                          }}
                        >
                          {date.getDate()}
                        </Text>

                        {dayItems.length > 0 ? (
                          <View
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: isSelected ? "#fff" : "#0f172a",
                              marginTop: 2,
                            }}
                          />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <SectionCard
              title={selectedDate}
              items={selectedDateItems}
              onOpen={openItem}
              onTogglePriority={togglePriority}
              occurrenceDate={selectedDate}
            />

            {!selectedDateItems.length ? (
              <Text style={{ textAlign: "center", color: "#64748b" }}>
                Sem tarefas neste dia.
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <SectionCard
              title="⭐ Prioritárias"
              items={
                priorityItems.filter(
                  (item) =>
                    containerFilter === "all" ||
                    item.containerId === containerFilter
                )
              }
              onOpen={openItem}
              onTogglePriority={togglePriority}
            />

            <SectionCard
              title="📋 Todas"
              items={
                normalItems.filter(
                  (item) =>
                    containerFilter === "all" ||
                    item.containerId === containerFilter
                )
              }
              onOpen={openItem}
              onTogglePriority={togglePriority}
            />

            {!activeListItems.length ? (
              <Text style={{ textAlign: "center", color: "#64748b" }}>
                Sem tarefas ativas.
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
