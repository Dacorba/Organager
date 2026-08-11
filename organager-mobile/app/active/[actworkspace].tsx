import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { BackButton } from "../../components/back-button";
import { useAppStore } from "../../store/useAppStore";
import { Item, RecurrenceType, WorkspaceId } from "../../types";
import {
  formatDateISO,
  isItemVisibleInActiveList,
  isOccurrenceFinished,
  itemOccursOnDate,
  todayISO,
} from "../../utils/calendar";
import { compareActiveItems, compareCalendarItems } from "../../utils/priority";
import { sortContainers } from "../../utils/containers";

type ViewMode = "active" | "calendar";

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
    showDetails,
    onMovePriority,
    isFirstPriority,
    isLastPriority,
  }: {
    item: Item;
    onOpen: (id: string) => void;
    onTogglePriority: (id: string) => void;
    showDetails: boolean;
    onMovePriority?: (id: string, direction: "up" | "down") => void;
    isFirstPriority?: boolean;
    isLastPriority?: boolean;
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

        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              item.priority === "Alta" ? "Retirar prioridade" : "Marcar como prioritária"
            }
            onPress={(event) => {
              event.stopPropagation();
              onTogglePriority(item.id);
            }}
            style={{
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
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

          {onMovePriority ? (
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Subir na ordem desta lista"
                disabled={isFirstPriority}
                onPress={(event) => {
                  event.stopPropagation();
                  onMovePriority(item.id, "up");
                }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: "#e2e8f0",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: isFirstPriority ? 0.25 : 1,
                }}
              >
                <Text style={{ fontSize: 28, fontWeight: "900", color: "#334155" }}>↑</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Descer na ordem desta lista"
                disabled={isLastPriority}
                onPress={(event) => {
                  event.stopPropagation();
                  onMovePriority(item.id, "down");
                }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: "#e2e8f0",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: isLastPriority ? 0.25 : 1,
                }}
              >
                <Text style={{ fontSize: 28, fontWeight: "900", color: "#334155" }}>↓</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
      {showDetails ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          <Badge label={item.category} />
          <Badge label={item.state === "Não feito" ? "Novo" : item.state} />
          <Badge label={item.dateISO ? item.dateText ?? item.dateISO : "Aberta"} />
          <Badge label={recurrenceLabel(item.recurrence)} />
          <Badge label={item.person ? `👤 ${item.person}` : undefined} />
        </View>
      ) : null}
    </Pressable>
  );
}

function SectionCard({
  title,
  items,
  onOpen,
  onTogglePriority,
  occurrenceDate,
  showDetails,
  onMovePriority,
}: {
  title: string;
  items: Item[];
  onOpen: (id: string, occurrenceDate?: string) => void;
  onTogglePriority: (id: string) => void;
  occurrenceDate?: string;
  showDetails: boolean;
  onMovePriority?: (id: string, direction: "up" | "down") => void;
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

      {items.map((item, index) => {
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
            showDetails={showDetails}
            onMovePriority={onMovePriority}
            isFirstPriority={index === 0}
            isLastPriority={index === items.length - 1}
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
  const movePriorityItem = useAppStore((s) => s.movePriorityItem);
  const [containerFilter, setContainerFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [showDetails, setShowDetails] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const currentWorkspace = useMemo(
    () => workspaces.find((w) => w.id === workspaceId),
    [workspaces, workspaceId]
  );

  const containers = useMemo(
    () => sortContainers(allContainers.filter((c) => c.workspaceId === workspaceId)),
    [allContainers, workspaceId]
  );

  useEffect(() => {
    if (typeof containerId === "string" && containerId.length > 0) {
      setContainerFilter(containerId);
    }
  }, [containerId]);

  const workspaceItems = useMemo(() => {
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
    return workspaceItems.filter(
      (item) =>
        isItemVisibleInActiveList(item) &&
        (containerFilter === "all" || item.containerId === containerFilter)
    );
  }, [workspaceItems, containerFilter]);

  const calendarItems = useMemo(() => {
    return workspaceItems.filter(
      (item) => containerFilter === "all" || item.containerId === containerFilter
    );
  }, [workspaceItems, containerFilter]);

  const activeListItems = useMemo(() => {
    return filteredByContainer.slice().sort(compareActiveItems);
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
    return calendarItems
      .filter(
        (item) =>
          itemOccursOnDate(item, selectedDate) &&
          !isOccurrenceFinished(item, selectedDate)
      )
      .sort(compareCalendarItems);
  }, [calendarItems, selectedDate]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, Item[]>();

    calendarDays.forEach((date) => {
      if (!date) return;

      const key = formatDateISO(date);
      const dayItems = calendarItems
        .filter(
          (item) => itemOccursOnDate(item, key) && !isOccurrenceFinished(item, key)
        )
        .sort(compareCalendarItems);

      if (dayItems.length > 0) {
        map.set(key, dayItems);
      }
    });

    return map;
  }, [calendarDays, calendarItems]);

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
          <BackButton />
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
          <SelectPill
            label={showDetails ? "Vista detalhada" : "Vista compacta"}
            active={showDetails}
            onPress={() => setShowDetails((current) => !current)}
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
              showDetails={showDetails}
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
              showDetails={showDetails}
              onMovePriority={(id, direction) =>
                movePriorityItem(
                  id,
                  direction,
                  priorityItems.map((item) => item.id)
                )
              }
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
              showDetails={showDetails}
              onMovePriority={(id, direction) =>
                movePriorityItem(
                  id,
                  direction,
                  normalItems.map((item) => item.id)
                )
              }
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
