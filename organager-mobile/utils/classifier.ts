import { ItemCategory, WorkspaceId } from "@/types";

export function classifyItem(text: string, workspaceId: WorkspaceId): ItemCategory {
  const lower = text.toLowerCase();

  const hasDateOrTime =
    lower.includes("hoje") ||
    lower.includes("amanhã") ||
    lower.includes("segunda") ||
    lower.includes("terça") ||
    lower.includes("quarta") ||
    lower.includes("quinta") ||
    lower.includes("sexta") ||
    lower.includes("sábado") ||
    lower.includes("domingo") ||
    /\b\d{1,2}[:h]\d{0,2}\b/.test(lower);

  if (lower.includes("reuni") || lower.includes("meeting") || lower.includes("call")) {
    return "Event";
  }

  if (lower.includes("lembrar") || lower.includes("remind") || lower.includes("avisa")) {
    return "Reminder";
  }

  if (workspaceId === "rovisys") {
    if (lower.includes("risco") || lower.includes("atras") || lower.includes("escorrega") || lower.includes("impacta")) {
      return "Risk";
    }

    if (lower.includes("bloqueado") || lower.includes("problema") || lower.includes("erro") || lower.includes("falha")) {
      return "Issue";
    }

    if (lower.includes("à espera") || lower.includes("esperar") || lower.includes("fornecedor") || lower.includes("resposta")) {
      return "Waiting";
    }

    if (lower.includes("decid") || lower.includes("avançar") || lower.includes("vamos fazer")) {
      return "Decision";
    }

    if (lower.includes("follow") || lower.includes("confirmar") || lower.includes("rever")) {
      return "Follow-up";
    }

    if (lower.includes("nota") || lower.includes("cliente") || lower.includes("preocupado")) {
      return "Note";
    }

    if (hasDateOrTime) return "Event";

    return "Task";
  }

  if (lower.includes("ideia") || lower.includes("talvez") || lower.includes("explorar")) return "Idea";
  if (lower.includes("beat") || lower.includes("loop") || lower.includes("sample") || lower.includes("drill") || lower.includes("mix") || lower.includes("master")) return "Music";
  if (lower.includes("pricing") || lower.includes("site") || lower.includes("venda") || lower.includes("negócio") || lower.includes("business")) return "Business";
  if (lower.includes("saúde") || lower.includes("ginásio") || lower.includes("treino") || lower.includes("dieta")) return "Health";
  if (lower.includes("dinheiro") || lower.includes("investir") || lower.includes("etf") || lower.includes("finanças")) return "Finance";
  if (lower.includes("aprender") || lower.includes("curso") || lower.includes("estudar")) return "Learning";
  if (lower.includes("nota")) return "Note";
  if (hasDateOrTime) return "Event";

  return "Task";
}