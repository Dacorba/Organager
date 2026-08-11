import assert from "node:assert/strict";
import test from "node:test";

import {
  compareActiveItems,
  compareCalendarItems,
  movePriorityId,
} from "../utils/priority.ts";

function item(id, overrides = {}) {
  return {
    id,
    workspaceId: "personal",
    containerId: "area-1",
    title: id,
    description: "",
    category: "Task",
    state: "Novo",
    createdAt: "11/08/2026, 10:00",
    priority: "Baixa",
    recurrence: "none",
    ...overrides,
  };
}

test("no calendário, tarefas prioritárias aparecem antes das restantes", () => {
  const earlyLow = item("baixa cedo", { timeText: "08:00" });
  const lateHigh = item("alta tarde", {
    priority: "Alta",
    timeText: "18:00",
  });

  assert.deepEqual(
    [earlyLow, lateHigh].sort(compareCalendarItems).map(({ id }) => id),
    ["alta tarde", "baixa cedo"]
  );
});

test("a ordem manual prevalece entre tarefas prioritárias", () => {
  const first = item("primeira", {
    priority: "Alta",
    priorityOrder: 0,
    timeText: "18:00",
  });
  const second = item("segunda", {
    priority: "Alta",
    priorityOrder: 1,
    timeText: "08:00",
  });

  assert.deepEqual(
    [second, first].sort(compareActiveItems).map(({ id }) => id),
    ["primeira", "segunda"]
  );
});

test("a ordem manual também prevalece entre tarefas não prioritárias", () => {
  const first = item("primeira", { priorityOrder: 0, dateISO: "2026-08-20" });
  const second = item("segunda", { priorityOrder: 1, dateISO: "2026-08-10" });

  assert.deepEqual(
    [second, first].sort(compareActiveItems).map(({ id }) => id),
    ["primeira", "segunda"]
  );
});

test("mover numa lista filtrada preserva a posição de itens ocultos", () => {
  assert.deepEqual(
    movePriorityId(["a", "oculta", "b"], ["a", "b"], "b", "up"),
    ["b", "oculta", "a"]
  );
});

test("mover além dos limites não altera a ordem", () => {
  assert.deepEqual(movePriorityId(["a", "b"], ["a", "b"], "a", "up"), [
    "a",
    "b",
  ]);
  assert.deepEqual(
    movePriorityId(["a", "b"], ["a", "b"], "b", "down"),
    ["a", "b"]
  );
});
