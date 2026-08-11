import { normalizeApiBaseUrl, testBackendConnection } from "@/services/backend";
import { useAppStore } from "@/store/useAppStore";
import {
  backupFileName,
  createBackupJSON,
  MAX_BACKUP_BYTES,
  parseBackupJSON,
} from "@/utils/backup";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

function WorkspaceCard({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        gap: 8,
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: "700", color: "#0f172a" }}>{title}</Text>
      <Text style={{ fontSize: 14, color: "#475569" }}>{subtitle}</Text>
      <Text style={{ marginTop: 8, fontSize: 14, fontWeight: "600", color: "#0f172a" }}>
        Entrar
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const apiBaseUrl = useAppStore((state) => state.apiBaseUrl);
  const setApiBaseUrl = useAppStore((state) => state.setApiBaseUrl);
  const containers = useAppStore((state) => state.containers);
  const items = useAppStore((state) => state.items);
  const restoreBackupData = useAppStore((state) => state.restoreBackupData);
  const [draftUrl, setDraftUrl] = useState(apiBaseUrl);
  const [testingBackend, setTestingBackend] = useState(false);
  const [backendMessage, setBackendMessage] = useState("");
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const [backupOk, setBackupOk] = useState<boolean | null>(null);

  useEffect(() => {
    setDraftUrl(apiBaseUrl);
  }, [apiBaseUrl]);

  function saveBackendUrl() {
    try {
      const normalizedUrl = normalizeApiBaseUrl(draftUrl);
      setApiBaseUrl(normalizedUrl);
      setDraftUrl(normalizedUrl);
      setBackendOk(null);
      setBackendMessage("Endereço guardado neste telemóvel.");
    } catch (error) {
      setBackendOk(false);
      setBackendMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function testBackend() {
    try {
      setTestingBackend(true);
      setBackendOk(null);
      setBackendMessage("A testar ligação...");
      const normalizedUrl = await testBackendConnection(draftUrl);
      setDraftUrl(normalizedUrl);
      setBackendOk(true);
      setBackendMessage("Ligação estabelecida com sucesso.");
    } catch (error) {
      setBackendOk(false);
      setBackendMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setTestingBackend(false);
    }
  }

  async function exportBackup() {
    try {
      setBackupBusy(true);
      setBackupOk(null);
      setBackupMessage("A preparar backup...");

      if (!(await Sharing.isAvailableAsync())) {
        throw new Error("A partilha de ficheiros não está disponível neste dispositivo.");
      }

      const json = createBackupJSON(containers, items);
      const file = new File(Paths.cache, backupFileName());
      file.create({ overwrite: true, intermediates: true });
      file.write(json);

      await Sharing.shareAsync(file.uri, {
        mimeType: "application/json",
        UTI: "public.json",
        dialogTitle: "Guardar backup do Organager",
      });

      setBackupOk(true);
      setBackupMessage("Backup criado. Confirma que o guardaste num local seguro.");
    } catch (error) {
      setBackupOk(false);
      setBackupMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBackupBusy(false);
    }
  }

  async function chooseBackupToRestore() {
    try {
      setBackupBusy(true);
      setBackupOk(null);
      setBackupMessage("A abrir o backup...");

      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/json", "text/plain"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        setBackupMessage("");
        return;
      }

      const asset = result.assets[0];
      if (!asset) throw new Error("Não foi possível abrir o ficheiro escolhido.");
      if (asset.size !== undefined && asset.size > MAX_BACKUP_BYTES) {
        throw new Error("O ficheiro de backup excede 5 MB.");
      }

      const backup = parseBackupJSON(await new File(asset.uri).text());
      const projectCount = backup.containers.filter(
        (container) => !container.id.startsWith("unassigned-")
      ).length;
      const exportedAt = new Date(backup.exportedAt).toLocaleString("pt-PT");

      setBackupMessage("Backup válido. Aguarda confirmação.");
      Alert.alert(
        "Restaurar este backup?",
        `Criado em ${exportedAt}.\n\n${projectCount} projetos/áreas\n${backup.items.length} tarefas\n\nOs dados atuais serão substituídos.`,
        [
          {
            text: "Cancelar",
            style: "cancel",
            onPress: () => setBackupMessage("Restauro cancelado."),
          },
          {
            text: "Restaurar",
            style: "destructive",
            onPress: () => {
              restoreBackupData(backup.containers, backup.items);
              setBackupOk(true);
              setBackupMessage(
                `Backup restaurado: ${backup.items.length} tarefas e ${projectCount} projetos/áreas.`
              );
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      setBackupOk(false);
      setBackupMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBackupBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 34, fontWeight: "700", color: "#0f172a" }}>
            Organager
          </Text>
          <Text style={{ fontSize: 15, color: "#475569" }}>
            Escolhe o modo de entrada: trabalho ou pessoal.
          </Text>
        </View>

        <View style={{ gap: 14 }}>
          <WorkspaceCard
            title="Trabalho"
            subtitle="Projetos, lista ativa global e captura rápida por voz."
            onPress={() => router.push("/workspace/rovisys")}
          />
          <WorkspaceCard
            title="Pessoal"
            subtitle="Áreas, lista ativa global e organização pessoal."
            onPress={() => router.push("/workspace/personal")}
          />
        </View>

        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 24,
            padding: 18,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            gap: 12,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#0f172a" }}>
              Dados e backup
            </Text>
            <Text style={{ color: "#475569", lineHeight: 20 }}>
              Guarda projetos, áreas e tarefas num ficheiro ou restaura um backup anterior.
            </Text>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <Pressable
              onPress={exportBackup}
              disabled={backupBusy}
              style={{
                minHeight: 48,
                justifyContent: "center",
                backgroundColor: backupBusy ? "#94a3b8" : "#0f172a",
                borderRadius: 14,
                paddingHorizontal: 18,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>
                Exportar backup
              </Text>
            </Pressable>

            <Pressable
              onPress={chooseBackupToRestore}
              disabled={backupBusy}
              style={{
                minHeight: 48,
                justifyContent: "center",
                backgroundColor: backupBusy ? "#cbd5e1" : "#e2e8f0",
                borderRadius: 14,
                paddingHorizontal: 18,
              }}
            >
              <Text style={{ color: "#0f172a", fontWeight: "800" }}>
                Restaurar backup
              </Text>
            </Pressable>
          </View>

          {backupMessage ? (
            <Text
              style={{
                color: backupOk === false ? "#b91c1c" : backupOk ? "#15803d" : "#475569",
                fontWeight: "600",
              }}
            >
              {backupMessage}
            </Text>
          ) : null}

          <Text style={{ color: "#64748b", fontSize: 12 }}>
            Estado atual: {items.length} tarefas ·{" "}
            {containers.filter((container) => !container.id.startsWith("unassigned-")).length}{" "}
            projetos/áreas
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 24,
            padding: 18,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            gap: 12,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#0f172a" }}>
              Backend
            </Text>
            <Text style={{ color: "#475569", lineHeight: 20 }}>
              Altera este endereço quando o computador mudar de rede ou de IP.
            </Text>
          </View>

          <TextInput
            value={draftUrl}
            onChangeText={(value) => {
              setDraftUrl(value);
              setBackendOk(null);
              setBackendMessage("");
            }}
            placeholder="http://192.168.1.11:8010"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={{
              borderWidth: 1,
              borderColor: "#cbd5e1",
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: "#0f172a",
              backgroundColor: "#fff",
            }}
          />

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <Pressable
              onPress={saveBackendUrl}
              style={{
                minHeight: 48,
                justifyContent: "center",
                backgroundColor: "#0f172a",
                borderRadius: 14,
                paddingHorizontal: 18,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>Guardar</Text>
            </Pressable>

            <Pressable
              onPress={testBackend}
              disabled={testingBackend}
              style={{
                minHeight: 48,
                justifyContent: "center",
                backgroundColor: testingBackend ? "#94a3b8" : "#e2e8f0",
                borderRadius: 14,
                paddingHorizontal: 18,
              }}
            >
              <Text style={{ color: "#0f172a", fontWeight: "800" }}>
                {testingBackend ? "A testar..." : "Testar ligação"}
              </Text>
            </Pressable>
          </View>

          {backendMessage ? (
            <Text
              style={{
                color: backendOk === false ? "#b91c1c" : backendOk ? "#15803d" : "#475569",
                fontWeight: "600",
              }}
            >
              {backendMessage}
            </Text>
          ) : null}

          <Text style={{ color: "#64748b", fontSize: 12 }}>
            Em uso: {apiBaseUrl}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
