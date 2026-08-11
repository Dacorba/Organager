import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";

import { BackButton } from "../components/back-button";
import { useAppStore } from "../store/useAppStore";
import {
  daysBetweenISO,
  isBirthdayItem,
  nextBirthdayOccurrenceISO,
  todayISO,
} from "../utils/calendar";

function dateLabel(dateISO: string, daysUntil: number | null) {
  const [year, month, day] = dateISO.split("-").map(Number);
  const formatted = new Date(year, month - 1, day).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (daysUntil === 0) return `Hoje · ${formatted}`;
  if (daysUntil === 1) return `Amanhã · ${formatted}`;
  return daysUntil === null ? formatted : `Daqui a ${daysUntil} dias · ${formatted}`;
}

export default function BirthdaysScreen() {
  const items = useAppStore((state) => state.items);
  const currentDateISO = todayISO();

  const birthdays = useMemo(
    () =>
      items
        .filter(
          (item) =>
            item.workspaceId === "personal" &&
            item.state !== "Arquivado" &&
            isBirthdayItem(item)
        )
        .map((item) => ({
          item,
          nextDateISO: nextBirthdayOccurrenceISO(item, currentDateISO),
        }))
        .filter(
          (entry): entry is typeof entry & { nextDateISO: string } =>
            entry.nextDateISO !== null
        )
        .sort(
          (entryA, entryB) =>
            entryA.nextDateISO.localeCompare(entryB.nextDateISO) ||
            entryA.item.title.localeCompare(entryB.item.title, "pt-PT")
        ),
    [currentDateISO, items]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <BackButton />

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 30, fontWeight: "800", color: "#0f172a" }}>
            🎂 Aniversários
          </Text>
          <Text style={{ color: "#475569", lineHeight: 20 }}>
            Todos os aniversários ficam guardados aqui. Na lista ativa aparecem na
            véspera e no próprio dia.
          </Text>
        </View>

        <Pressable
          onPress={() =>
            router.push({
              pathname: "/detail/[id]",
              params: {
                id: "new",
                workspace: "personal",
                containerId: "unassigned-personal",
                recurrence: "yearly",
              },
            })
          }
          style={{
            minHeight: 48,
            borderRadius: 14,
            backgroundColor: "#0f172a",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 16,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>+ Novo aniversário</Text>
        </Pressable>

        <View style={{ gap: 10 }}>
          {birthdays.map(({ item, nextDateISO }) => {
            const daysUntil = daysBetweenISO(currentDateISO, nextDateISO);
            return (
              <Pressable
                key={item.id}
                onPress={() =>
                  router.push({
                    pathname: "/detail/[id]",
                    params: {
                      id: item.id,
                      workspace: item.workspaceId,
                      occurrenceDate: nextDateISO,
                    },
                  })
                }
                style={{
                  backgroundColor: "#fff",
                  borderWidth: 1,
                  borderColor: "#fbcfe8",
                  borderRadius: 18,
                  padding: 16,
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#0f172a" }}>
                  {item.title}
                </Text>
                <Text style={{ color: "#9d174d", fontWeight: "700" }}>
                  {dateLabel(nextDateISO, daysUntil)}
                </Text>
                {item.description ? (
                  <Text style={{ color: "#64748b" }}>{item.description}</Text>
                ) : null}
              </Pressable>
            );
          })}

          {!birthdays.length ? (
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 18,
                padding: 18,
                borderWidth: 1,
                borderColor: "#e2e8f0",
              }}
            >
              <Text style={{ color: "#64748b", textAlign: "center" }}>
                Ainda não existem aniversários. Ao criar um, escolhe “Anual / aniversário”.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
