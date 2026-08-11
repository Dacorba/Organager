import { BackButton } from "@/components/back-button";
import { useAppStore } from "@/store/useAppStore";
import { ItemState, WorkspaceId } from "@/types";
import { todayISO } from "@/utils/calendar";
import {
  getPersonalDailySummary,
  timestampIsOnDate,
} from "@/utils/daily-summary";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView, ScrollView, Text, View } from "react-native";

function formatLines(lines: string[]) {
  return lines.length ? lines.map((line) => `• ${line}`).join("\n") : "—";
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: 90,
        backgroundColor: "#fff",
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "800", color: "#0f172a" }}>
        {value}
      </Text>
      <Text style={{ color: "#64748b", fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

function SummarySection({ title, lines }: { title: string; lines: string[] }) {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 22,
        padding: 16,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        gap: 10,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "800", color: "#0f172a" }}>
        {title}
      </Text>
      <Text style={{ color: "#334155", lineHeight: 24 }}>
        {formatLines(lines)}
      </Text>
    </View>
  );
}

export default function ReportScreen() {
  const { workspace } = useLocalSearchParams<{ workspace: WorkspaceId }>();
  const workspaceId = workspace as WorkspaceId;
  const getWorkspace = useAppStore((state) => state.getWorkspace);
  const items = useAppStore((state) => state.items);
  const currentWorkspace = getWorkspace(workspaceId);

  if (!currentWorkspace) return null;

  const today = todayISO();

  if (workspaceId === "personal") {
    const summary = getPersonalDailySummary(items, today);

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <BackButton />

          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 30, fontWeight: "700", color: "#0f172a" }}>
              Resumo do dia
            </Text>
            <Text style={{ color: "#64748b" }}>{today}</Text>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <Stat label="Propostas" value={summary.plannedCount} />
            <Stat label="Feitas" value={summary.completed.length} />
            <Stat label="Pendentes" value={summary.pending.length} />
            <Stat label="Concluído" value={`${summary.completionPercentage}%`} />
          </View>

          <SummarySection
            title="Feitas hoje"
            lines={summary.completed.map((item) => item.title)}
          />
          <SummarySection
            title="Ainda pendentes"
            lines={summary.pending.map((item) => item.title)}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const dailyEntries = items.flatMap((item) => {
    if (item.workspaceId !== workspaceId) return [];

    const recurrence = item.recurrence ?? "none";
    if (recurrence !== "none") {
      const occurrenceState = item.occurrenceStates?.[today];
      const updatedToday = timestampIsOnDate(
        item.occurrenceStateUpdatedAt?.[today],
        today
      );
      return occurrenceState && updatedToday
        ? [{ title: `${item.title} (${today})`, state: occurrenceState }]
        : [];
    }

    return timestampIsOnDate(item.stateUpdatedAt, today)
      ? [{ title: item.title, state: item.state }]
      : [];
  });

  const titlesForState = (state: ItemState) =>
    dailyEntries.filter((entry) => entry.state === state).map((entry) => entry.title);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <BackButton />

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 30, fontWeight: "700", color: "#0f172a" }}>
            Relatório diário
          </Text>
          <Text style={{ color: "#64748b" }}>
            {currentWorkspace.name} · {today}
          </Text>
        </View>

        <SummarySection title="Feito hoje" lines={titlesForState("Feito")} />
        <SummarySection title="Parcial" lines={titlesForState("Parcial")} />
        <SummarySection title="Bloqueado" lines={titlesForState("Bloqueado")} />
        <SummarySection title="Passa para amanhã" lines={titlesForState("Adiado")} />
      </ScrollView>
    </SafeAreaView>
  );
}
