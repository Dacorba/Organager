import assert from "node:assert/strict";
import test from "node:test";

import { getPersonalDailySummary } from "../utils/daily-summary.ts";

const today = "2026-08-11";

function item(overrides = {}) {
  return {
    id: Math.random().toString(),
    workspaceId: "personal",
    containerId: "area-1",
    title: "Teste",
    description: "Teste",
    category: "Task",
    state: "Novo",
    createdAt: "11/08/2026, 09:00",
    recurrence: "none",
    ...overrides,
  };
}

test("resume tarefas pessoais propostas, feitas e pendentes no dia", () => {
  const pendingOpen = item({ id: "open", title: "Aberta" });
  const overdue = item({ id: "late", title: "Atrasada", dateISO: "2026-08-10" });
  const future = item({ id: "future", dateISO: "2026-08-12" });
  const completedToday = item({
    id: "done-today",
    title: "Feita hoje",
    state: "Feito",
    stateUpdatedAt: "2026-08-11T10:00:00.000Z",
  });
  const completedYesterday = item({
    id: "done-yesterday",
    state: "Feito",
    stateUpdatedAt: "2026-08-10T10:00:00.000Z",
  });
  const backlog = item({ id: "backlog", state: "Backlog" });

  const summary = getPersonalDailySummary(
    [pendingOpen, overdue, future, completedToday, completedYesterday, backlog],
    today
  );

  assert.deepEqual(summary.pending.map((entry) => entry.id), ["open", "late"]);
  assert.deepEqual(summary.completed.map((entry) => entry.id), ["done-today"]);
  assert.equal(summary.plannedCount, 3);
  assert.equal(summary.completionPercentage, 33);
});

test("conta apenas a ocorrência recorrente concluída hoje", () => {
  const recurring = item({
    id: "recurring",
    dateISO: "2026-08-01",
    recurrence: "daily",
    occurrenceStates: { [today]: "Feito" },
    occurrenceStateUpdatedAt: { [today]: "2026-08-11T08:00:00.000Z" },
  });

  const summary = getPersonalDailySummary([recurring], today);
  assert.deepEqual(summary.completed.map((entry) => entry.id), ["recurring"]);
  assert.equal(summary.pending.length, 0);
  assert.equal(summary.completionPercentage, 100);
});
