import { router } from "expo-router";
import { Pressable, Text } from "react-native";

export function BackButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      onPress={onPress ?? (() => router.back())}
      style={({ pressed }) => ({
        alignSelf: "flex-start",
        minHeight: 48,
        minWidth: 112,
        justifyContent: "center",
        paddingHorizontal: 16,
        borderRadius: 14,
        backgroundColor: pressed ? "#cbd5e1" : "#e2e8f0",
      })}
    >
      <Text style={{ fontSize: 17, fontWeight: "800", color: "#0f172a" }}>
        ← Voltar
      </Text>
    </Pressable>
  );
}
