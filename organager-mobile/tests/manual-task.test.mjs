import assert from "node:assert/strict";
import test from "node:test";

import { createManualTaskDraft } from "../utils/manual-task.ts";

test("cria uma tarefa manual com valores seguros", () => {
  const draft = createManualTaskDraft(
    "  Comprar pão\nPassar pela padaria depois do trabalho.  ",
    "area-1"
  );

  assert.equal(draft.title, "Comprar pão");
  assert.equal(
    draft.description,
    "Comprar pão\nPassar pela padaria depois do trabalho."
  );
  assert.equal(draft.containerId, "area-1");
  assert.equal(draft.category, "Task");
  assert.equal(draft.state, "Novo");
  assert.equal(draft.priority, "Baixa");
  assert.equal(draft.recurrence, "none");
});

test("limita títulos manuais longos", () => {
  const draft = createManualTaskDraft("a".repeat(90), "proj-1");
  assert.equal(draft.title, `${"a".repeat(70)}...`);
});

test("rejeita uma tarefa manual vazia", () => {
  assert.throws(
    () => createManualTaskDraft("   \n  ", "area-1"),
    /Escreve primeiro/
  );
});
