import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAppStore } from "../../store/useAppStore";
import { WorkspaceId } from "../../types";

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

  const [newName, setNewName] = useState("");

  const currentWorkspace = useMemo(
    () => workspaces.find((w) => w.id === workspaceId),
    [workspaces, workspaceId]
  );

  const containers = useMemo(
    () => allContainers.filter((c) => c.workspaceId === workspaceId),
    [allContainers, workspaceId]
  );

  if (!currentWorkspace) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}>
            ← Voltar
          </Text>
        </Pressable>
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

          {workspaceId === "rovisys" ? (
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
                Relatório diário
              </Text>
            </Pressable>
          ) : null}

          <Pressable
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
            <Text style={{ fontSize: 22 }}>🎤</Text>
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
          {containers.map((container) => (
            <Pressable
              key={container.id}
              onPress={() =>
                router.push({
                  pathname: "/active/[actworkspace]",
                  params: {
                    actworkspace: workspaceId,
                    containerId: container.id,
                  },
                })
              }
            >
              <Card>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#0f172a" }}>
                  {container.name}
                </Text>
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
