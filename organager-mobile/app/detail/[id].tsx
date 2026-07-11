import { analyzePoint } from "@/services/analyzePoint";
import { useAppStore } from "@/store/useAppStore";
import { ItemCategory, ItemState, Priority, RecurrenceType, WorkspaceId } from "@/types";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

type Preview = {
  title: string;
  description: string;
  category: ItemCategory;
  state: ItemState;
  priority: Priority;
  containerId: string;
  person?: string | null;
  dateText?: string | null;
  timeText?: string | null;
  dateISO?: string | null;
  recurrence: RecurrenceType;
};

const recurrenceOptions: { value: RecurrenceType; label: string }[] = [
  { value: "none", label: "Sem recorrência" },
  { value: "daily", label: "Todos os dias" },
  { value: "weekdays", label: "Dias úteis" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "yearly", label: "Anual / aniversário" },
];

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

function isValidTime(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export default function DetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    workspace?: WorkspaceId;
    containerId?: string;
    occurrenceDate?: string;
  }>();

  const items = useAppStore((s) => s.items);
  const workspaces = useAppStore((s) => s.workspaces);
  const allContainers = useAppStore((s) => s.containers);
  const addAnalyzedPoint = useAppStore((s) => s.addAnalyzedPoint);
  const updateAnalyzedPoint = useAppStore((s) => s.updateAnalyzedPoint);
  const updateItemState = useAppStore((s) => s.updateItemState);
  const removeItem = useAppStore((s) => s.removeItem);

  const isNew = params.id === "new";
  const item = useMemo(
    () => (isNew ? undefined : items.find((i) => i.id === params.id)),
    [items, isNew, params.id]
  );

  const containerId = isNew ? params.containerId : item?.containerId;
  const containerFromParam = allContainers.find((c) => c.id === containerId);

    const workspaceId = (
      isNew
        ? params.workspace ?? containerFromParam?.workspaceId ?? "rovisys"
        : item?.workspaceId ?? "rovisys"
    ) as WorkspaceId;

  const workspace = useMemo(
    () => workspaces.find((w) => w.id === workspaceId),
    [workspaces, workspaceId]
  );

  const containers = useMemo(
    () => allContainers.filter((c) => c.workspaceId === workspaceId),
    [allContainers, workspaceId]
  );

  const container = useMemo(
    () => allContainers.find((c) => c.id === containerId),
    [allContainers, containerId]
  );

  const [text, setText] = useState(item?.description ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [listening, setListening] = useState(false);

  const occurrenceDate =
    typeof params.occurrenceDate === "string" ? params.occurrenceDate : undefined;
  const isRecurringItem = (item?.recurrence ?? "none") !== "none";
  const currentState =
    item && isRecurringItem && occurrenceDate
      ? item.occurrenceStates?.[occurrenceDate] ?? item.state
      : item?.state;

  useEffect(() => {
    const resultSub = ExpoSpeechRecognitionModule.addListener("result", (event) => {
      const transcript = event.results?.[0]?.transcript ?? "";
      if (transcript) setText(transcript);
    });

    const endSub = ExpoSpeechRecognitionModule.addListener("end", () => {
      setListening(false);
    });

    const errorSub = ExpoSpeechRecognitionModule.addListener("error", () => {
      setListening(false);
      setMessage("Erro no microfone.");
    });

    return () => {
      resultSub.remove();
      endSub.remove();
      errorSub.remove();
    };
  }, []);

  if (!workspace) {
    return (
      <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>
          Workspace não encontrado
        </Text>
      </View>
    );
  }

  const unassignedId = `unassigned-${workspace.id}`;

  async function startListening() {
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      if (!permission.granted) {
        setMessage("Permissão de microfone recusada.");
        return;
      }

      setMessage("A ouvir...");
      setListening(true);

      ExpoSpeechRecognitionModule.start({
        lang: "pt-PT",
        interimResults: true,
      });
    } catch {
      setListening(false);
      setMessage("Não consegui iniciar o microfone.");
    }
  }

  async function handleAnalyze() {
    setMessage("AI: botão clicado.");

    if (!text.trim()) {
      setMessage("AI: texto vazio.");
      return;
    }

    try {
      setLoading(true);
      setMessage("AI: a chamar backend...");

      const result = await analyzePoint({
        workspaceId,
        rawText: text,
        containers: containers
          .filter((c) => !c.id.startsWith("unassigned-"))
          .map((c) => ({ id: c.id, name: c.name })),
      });

      setMessage("AI: resposta recebida.");

      setPreview({
        title: result.title,
        description: result.cleanedText,
        category: result.category,
        state: item?.state ?? result.suggestedState,
        priority: result.priority,
        containerId: result.containerId ?? unassignedId,
        person: result.person,
        dateText: result.dateText,
        timeText: result.timeText,
        dateISO: result.dateISO,
        recurrence: item?.recurrence ?? "none",

      });
    } catch (error) {
      setMessage(`AI erro: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  function savePreview() {
    if (!preview) return;

    const normalizedDate = preview.dateISO?.trim() ?? "";
    const normalizedTime = preview.timeText?.trim() ?? "";

    if (!preview.title.trim()) {
      setMessage("O título não pode ficar vazio.");
      return;
    }

    if (preview.recurrence !== "none" && !normalizedDate) {
      setMessage("Para tarefas recorrentes, tens de meter uma data de início.");
      return;
    }

    if (normalizedDate && !isValidDateISO(normalizedDate)) {
      setMessage("A data tem de existir e usar o formato YYYY-MM-DD.");
      return;
    }

    if (normalizedTime && !isValidTime(normalizedTime)) {
      setMessage("A hora tem de usar o formato HH:MM, entre 00:00 e 23:59.");
      return;
    }

    const payload = {
      workspaceId: workspaceId as WorkspaceId,
      containerId: preview.containerId,
      title: preview.title.trim(),
      description: preview.description,
      category: preview.category,
      state: preview.state,
      priority: preview.priority,
      person: preview.person,
      dateText: preview.dateText,
      timeText: normalizedTime || null,
      dateISO: normalizedDate || null,
      recurrence: preview.recurrence,
    };

    if (isNew) {
      addAnalyzedPoint(payload);
    } else if (item) {
      updateAnalyzedPoint(item.id, payload);
    }

    setText("");
    setPreview(null);
    setMessage(isNew ? "Guardado na lista ativa." : "Alterações guardadas.");
    router.replace(`/workspace/${workspaceId}`);
  }

  function deleteCurrentItem() {
    if (isNew || !item) return;

    Alert.alert(
      "Eliminar tarefa?",
      `“${item.title}” será eliminada permanentemente.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            removeItem(item.id);
            router.back();
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Pressable
        onPress={() => router.back()}
        style={{
          alignSelf: "flex-start",
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 14,
          backgroundColor: "#e5e7eb",
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "900", color: "#0f172a" }}>
          ← Voltar
        </Text>
      </Pressable>

      <Text style={{ fontSize: 28, fontWeight: "bold", marginBottom: 4 }}>
        {isNew ? "Novo ponto" : item?.title}
      </Text>

      <Text style={{ color: "#666", marginBottom: 12 }}>
        {workspace.name}
        {container ? ` · ${container.name}` : ""}
      </Text>

      {!isNew && item ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: "#e2e8f0",
            borderRadius: 18,
            padding: 16,
            marginBottom: 16,
            backgroundColor: "#fff",
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "900" }}>
            Estado{occurrenceDate ? ` · ${occurrenceDate}` : ""}
          </Text>

          {isRecurringItem && !occurrenceDate ? (
            <Text style={{ color: "#64748b", lineHeight: 20 }}>
              Esta é uma série recorrente. Abre uma data no calendário para alterar
              apenas essa ocorrência.
            </Text>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {workspace.states.map((stateOption) => {
                const active = currentState === stateOption;

                return (
                  <Pressable
                    key={stateOption}
                    onPress={() => {
                      updateItemState(item.id, stateOption, occurrenceDate);
                      setMessage(
                        occurrenceDate
                          ? `Estado da ocorrência de ${occurrenceDate} atualizado.`
                          : "Estado atualizado."
                      );
                    }}
                    style={{
                      backgroundColor: active ? "#0f172a" : "#e5e7eb",
                      borderRadius: 999,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Text
                      style={{
                        color: active ? "#fff" : "#111827",
                        fontWeight: "800",
                      }}
                    >
                      {stateOption}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ) : null}

      <TextInput
        placeholder="Escreve aqui a tarefa, nota, reunião, ideia..."
        value={text}
        onChangeText={setText}
        multiline
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 14,
          padding: 14,
          minHeight: 140,
          marginBottom: 12,
          textAlignVertical: "top",
        }}
      />

      <Pressable
        onPress={handleAnalyze}
        disabled={loading}
        style={{
          backgroundColor: loading ? "#777" : "#000",
          padding: 16,
          borderRadius: 14,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>
          {loading ? "A analisar..." : "Analisar com AI"}
        </Text>
      </Pressable>

      <Pressable
        onPress={startListening}
        style={{
          backgroundColor: listening ? "#2563eb" : "#374151",
          padding: 16,
          borderRadius: 14,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>
          {listening ? "🎤 A ouvir..." : "🎤 Falar"}
        </Text>
      </Pressable>

      {message ? (
        <Text style={{ color: "red", marginBottom: 12 }}>{message}</Text>
      ) : null}

      {preview ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: "#e2e8f0",
            borderRadius: 18,
            padding: 16,
            marginBottom: 16,
            backgroundColor: "#fff",
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "900" }}>
            Confirmar antes de guardar
          </Text>

          <Text>Título</Text>
          <TextInput
            value={preview.title}
            onChangeText={(v) => setPreview({ ...preview, title: v })}
            style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 10 }}
          />

          <Text>Data</Text>
          <TextInput
            value={preview.dateISO ?? ""}
            onChangeText={(v) =>
              setPreview({ ...preview, dateISO: v, dateText: null })
            }
            placeholder="YYYY-MM-DD"
            style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 10 }}
          />

          <Text>Hora</Text>
          <TextInput
            value={preview.timeText ?? ""}
            onChangeText={(v) => setPreview({ ...preview, timeText: v })}
            placeholder="15:00"
            style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 10 }}
          />

          <Text>Recorrência</Text>

          <View style={{ gap: 8 }}>
            {recurrenceOptions.map((option) => {
              const active = preview.recurrence === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() =>
                    setPreview({
                      ...preview,
                      recurrence: option.value,
                    })
                  }
                  style={{
                    backgroundColor: active ? "#0f172a" : "#e5e7eb",
                    padding: 12,
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{
                      color: active ? "#fff" : "#111827",
                      fontWeight: "800",
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {preview.recurrence !== "none" && !preview.dateISO ? (
            <Text style={{ color: "#b45309", fontWeight: "700" }}>
              Para tarefas recorrentes, mete uma data de início em YYYY-MM-DD.
            </Text>
          ) : null}          

          <Text>Projeto</Text>
          {containers.map((c) => {
            const active = preview.containerId === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setPreview({ ...preview, containerId: c.id })}
                style={{
                  backgroundColor: active ? "#0f172a" : "#e5e7eb",
                  padding: 10,
                  borderRadius: 10,
                  marginBottom: 6,
                }}
              >
                <Text style={{ color: active ? "#fff" : "#111827", fontWeight: "700" }}>
                  {c.name}
                </Text>
              </Pressable>
            );
          })}

          <Text>Prioridade</Text>
          <Pressable
            onPress={() =>
              setPreview({
                ...preview,
                priority: preview.priority === "Alta" ? "Baixa" : "Alta",
              })
            }
            style={{
              backgroundColor: preview.priority === "Alta" ? "#ef4444" : "#1f2937",
              padding: 14,
              borderRadius: 14,
              alignItems: "center",
              shadowColor: preview.priority === "Alta" ? "#ef4444" : "transparent",
              shadowOpacity: preview.priority === "Alta" ? 0.7 : 0,
              shadowRadius: 10,
              elevation: preview.priority === "Alta" ? 8 : 0,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>
              ▲ {preview.priority === "Alta" ? "Prioritário" : "Baixa prioridade"}
            </Text>
          </Pressable>

          <Pressable
            onPress={savePreview}
            style={{
              backgroundColor: "#16a34a",
              padding: 16,
              borderRadius: 14,
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>Guardar</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={{ fontWeight: "bold", marginBottom: 6 }}>
        Containers disponíveis:
      </Text>

      {containers.map((c) => (
        <Text key={c.id} style={{ marginBottom: 4 }}>
          • {c.name}
        </Text>
      ))}
      {!isNew && item ? (
        <Pressable
          onPress={deleteCurrentItem}
          style={{
            backgroundColor: "#dc2626",
            padding: 16,
            borderRadius: 14,
            alignItems: "center",
            marginTop: 16,
            marginBottom: 40,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "900" }}>
            Eliminar tarefa
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
