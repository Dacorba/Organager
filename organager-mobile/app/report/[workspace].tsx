import { router, useLocalSearchParams } from "expo-router";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { useAppStore } from "@/store/useAppStore";
import { ItemState, WorkspaceId } from "@/types";

function formatLines(lines: string[]) {
  return lines.length ? lines.map((line) => `- ${line}`).join("\n") : "- sem registos";
}

function localDateISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timestampIsOnDate(timestamp: string | undefined, dateISO: string) {
  if (!timestamp) return false;

  const date = new Date(timestamp);
  return !Number.isNaN(date.getTime()) && localDateISO(date) === dateISO;
}

export default function ReportScreen() {
  const { workspace } = useLocalSearchParams<{ workspace: WorkspaceId }>();
  const workspaceId = workspace as WorkspaceId;

  const getWorkspace = useAppStore((s) => s.getWorkspace);
  const items = useAppStore((s) => s.items);

  const currentWorkspace = getWorkspace(workspaceId);

  if (!currentWorkspace || workspaceId !== "rovisys") return null;

  const today = localDateISO(new Date());
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

    const belongsToToday = timestampIsOnDate(item.stateUpdatedAt, today);

    return belongsToToday ? [{ title: item.title, state: item.state }] : [];
  });

  const titlesForState = (state: ItemState) =>
    dailyEntries.filter((entry) => entry.state === state).map((entry) => entry.title);

  const reportText = `Relatório diário — ${currentWorkspace.name} — ${today}

Feito hoje:
${formatLines(titlesForState("Feito"))}

Não feito:
${formatLines(titlesForState("Não feito"))}

Parcial:
${formatLines(titlesForState("Parcial"))}

Bloqueado:
${formatLines(titlesForState("Bloqueado"))}

Passa para amanhã:
${formatLines(titlesForState("Adiado"))}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}>
            ← Voltar
          </Text>
        </Pressable>

        <Text style={{ fontSize: 30, fontWeight: "700", color: "#0f172a" }}>
          Relatório diário
        </Text>

        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 24,
            padding: 16,
            borderWidth: 1,
            borderColor: "#e2e8f0",
          }}
        >
          <Text style={{ color: "#334155", lineHeight: 22 }}>{reportText}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
