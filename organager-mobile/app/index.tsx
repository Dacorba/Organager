import { router } from "expo-router";
import { Pressable, SafeAreaView, Text, View } from "react-native";

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
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <View style={{ flex: 1, padding: 20, gap: 20 }}>
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
      </View>
    </SafeAreaView>
  );
}