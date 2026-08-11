import { router, type Href, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAppStore } from "../../store/useAppStore";
import { WorkspaceId } from "../../types";
import { BackButton } from "../../components/back-button";
import { isUnassignedContainer, sortContainers } from "../../utils/containers";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: "#e2e8f0",
      }}
    >
      {children}
    </View>
  );
}

export default function WorkspaceScreen() {
  const { workspace } = useLocalSearchParams<{ workspace: WorkspaceId }>();
  const workspaceId = workspace as WorkspaceId;

  const workspaces = useAppStore((s) => s.workspaces);
  const allContainers = useAppStore((s) => s.containers);
  const addContainer = useAppStore((s) => s.addContainer);
  const renameContainer = useAppStore((s) => s.renameContainer);
  const removeContainer = useAppStore((s) => s.removeContainer);
  const moveContainer = useAppStore((s) => s.moveContainer);

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const currentWorkspace = useMemo(
    () => workspaces.find((w) => w.id === workspaceId),
    [workspaces, workspaceId]
  );

  const containers = useMemo(
    () => sortContainers(allContainers.filter((c) => c.workspaceId === workspaceId)),
    [allContainers, workspaceId]
  );
  const movableContainerIds = useMemo(
    () =>
      containers
        .filter((container) => !isUnassignedContainer(container))
        .map((container) => container.id),
    [containers]
  );

  if (!currentWorkspace) return null;

  function saveContainerName() {
    const name = editingName.trim();
    if (!editingId || !name) return;

    renameContainer(editingId, name);
    setEditingId(null);
    setEditingName("");
  }

  function confirmRemoveContainer(containerId: string, containerName: string) {
    Alert.alert(
      `Eliminar ${workspaceId === "rovisys" ? "projeto" : "área"}?`,
      `“${containerName}” será eliminado. As tarefas existentes passam para “Sem projeto”.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => removeContainer(containerId),
        },
      ]
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <BackButton />
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 30, fontWeight: "700", color: "#0f172a" }}>
            {currentWorkspace.name}
          </Text>
          <Text style={{ color: "#475569" }}>
            Escolhe {workspaceId === "rovisys" ? "um projeto" : "uma área"} ou cria um novo.
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/active/[actworkspace]",
                params: { actworkspace: workspaceId },
              })
            }
            style={{
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#cbd5e1",
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: "#0f172a", fontWeight: "600" }}>Lista ativa</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/report/[workspace]",
                params: { workspace: workspaceId },
              })
            }
            style={{
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#cbd5e1",
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: "#0f172a", fontWeight: "600" }}>
              {workspaceId === "personal" ? "Resumo do dia" : "Relatório diário"}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Adicionar nova tarefa"
            onPress={() => {
              if (!containers[0]) return;
              router.push({
                pathname: "/detail/[id]",
                params: {
                  id: "new",
                  workspace: workspaceId,
                  containerId: containers[0].id,
                },
              });
            }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#cbd5e1",
              backgroundColor: "#fff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 32, lineHeight: 34, color: "#0f172a" }}>+</Text>
          </Pressable>
        </View>

        <Card>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#0f172a",
              marginBottom: 10,
            }}
          >
            Novo {workspaceId === "rovisys" ? "projeto" : "área"}
          </Text>

          <View style={{ gap: 10 }}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder={workspaceId === "rovisys" ? "Ex.: AMS-02" : "Ex.: Branding"}
              style={{
                borderWidth: 1,
                borderColor: "#cbd5e1",
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 12,
                backgroundColor: "#fff",
              }}
            />

            <Pressable
              onPress={() => {
                const name = newName.trim();
                if (!name) return;
                addContainer(workspaceId, name);
                setNewName("");
              }}
              style={{
                backgroundColor: "#0f172a",
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>Criar</Text>
            </Pressable>
          </View>
        </Card>

        <View style={{ gap: 12 }}>
          {containers.map((container) => {
            const isEditing = editingId === container.id;
            const isUnassigned = isUnassignedContainer(container);
            const movableIndex = movableContainerIds.indexOf(container.id);

            return (
              <Card key={container.id}>
                {isEditing ? (
                  <View style={{ gap: 10 }}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: "#0f172a" }}>
                      Gerir {workspaceId === "rovisys" ? "projeto" : "área"}
                    </Text>
                    <TextInput
                      value={editingName}
                      onChangeText={setEditingName}
                      autoFocus
                      style={{
                        borderWidth: 1,
                        borderColor: "#cbd5e1",
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                      }}
                    />
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      <Pressable
                        onPress={saveContainerName}
                        style={{
                          backgroundColor: "#16a34a",
                          borderRadius: 12,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                        }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "700" }}>Guardar</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setEditingId(null);
                          setEditingName("");
                        }}
                        style={{
                          backgroundColor: "#e2e8f0",
                          borderRadius: 12,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                        }}
                      >
                        <Text style={{ color: "#334155", fontWeight: "700" }}>Cancelar</Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          confirmRemoveContainer(container.id, container.name)
                        }
                        style={{
                          backgroundColor: "#fee2e2",
                          borderRadius: 12,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                        }}
                      >
                        <Text style={{ color: "#b91c1c", fontWeight: "700" }}>
                          Eliminar
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 18,
                          fontWeight: "700",
                          color: "#0f172a",
                        }}
                      >
                        {container.name}
                      </Text>

                      {!isUnassigned ? (
                        <View style={{ flexDirection: "row", gap: 6 }}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Subir ${container.name}`}
                            disabled={movableIndex === 0}
                            onPress={() => moveContainer(container.id, "up")}
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 12,
                              backgroundColor: "#e2e8f0",
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: movableIndex === 0 ? 0.3 : 1,
                            }}
                          >
                            <Text style={{ fontSize: 28, fontWeight: "900", color: "#334155" }}>
                              ↑
                            </Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Descer ${container.name}`}
                            disabled={movableIndex === movableContainerIds.length - 1}
                            onPress={() => moveContainer(container.id, "down")}
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 12,
                              backgroundColor: "#e2e8f0",
                              alignItems: "center",
                              justifyContent: "center",
                              opacity:
                                movableIndex === movableContainerIds.length - 1 ? 0.3 : 1,
                            }}
                          >
                            <Text style={{ fontSize: 28, fontWeight: "900", color: "#334155" }}>
                              ↓
                            </Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>

                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: "/active/[actworkspace]",
                            params: {
                              actworkspace: workspaceId,
                              containerId: container.id,
                            },
                          })
                        }
                        style={{
                          backgroundColor: "#0f172a",
                          borderRadius: 12,
                          minHeight: 48,
                          flex: 1,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "700" }}>Entrar</Text>
                      </Pressable>

                      {!isUnassigned ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Gerir ${container.name}`}
                          onPress={() => {
                            setEditingId(container.id);
                            setEditingName(container.name);
                          }}
                          style={{
                            backgroundColor: "#e2e8f0",
                            borderRadius: 12,
                            width: 48,
                            height: 48,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ color: "#334155", fontSize: 22 }}>⚙</Text>
                        </Pressable>
                      ) : null}
                    </View>

                    {isUnassigned && workspaceId === "personal" ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Abrir todos os aniversários"
                        onPress={() => router.push("/birthdays" as Href)}
                        style={{
                          minHeight: 48,
                          borderRadius: 12,
                          backgroundColor: "#fce7f3",
                          alignItems: "center",
                          justifyContent: "center",
                          paddingHorizontal: 14,
                        }}
                      >
                        <Text style={{ color: "#9d174d", fontWeight: "800" }}>
                          🎂 Aniversários
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
