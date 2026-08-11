import assert from "node:assert/strict";
import test from "node:test";

import {
  daysBetweenISO,
  isItemVisibleInActiveList,
  nextBirthdayOccurrenceISO,
  isOccurrenceFinished,
  itemOccursOnDate,
} from "../utils/calendar.ts";

const today = "2026-08-08";

function item(overrides = {}) {
  return {
    id: "test",
    workspaceId: "personal",
    containerId: "area-1",
    title: "Teste",
    description: "Teste",
    category: "Task",
    state: "Novo",
    createdAt: "08/08/2026, 10:00",
    recurrence: "none",
    ...overrides,
  };
}

test("tarefas sem data aparecem apenas no dia atual", () => {
  const task = item();
  assert.equal(itemOccursOnDate(task, today, today), true);
  assert.equal(itemOccursOnDate(task, "2026-08-09", today), false);
});

test("tarefas atrasadas transitam para hoje, não para dias futuros", () => {
  const task = item({ dateISO: "2026-08-06" });
  assert.equal(itemOccursOnDate(task, "2026-08-06", today), false);
  assert.equal(itemOccursOnDate(task, today, today), true);
  assert.equal(itemOccursOnDate(task, "2026-08-09", today), false);
});

test("tarefas futuras aparecem apenas na data marcada", () => {
  const task = item({ dateISO: "2026-08-10" });
  assert.equal(itemOccursOnDate(task, today, today), false);
  assert.equal(itemOccursOnDate(task, "2026-08-10", today), true);
  assert.equal(itemOccursOnDate(task, "2026-08-11", today), false);
});

test("recorrências começam na data inicial e respeitam o padrão", () => {
  const daily = item({ dateISO: "2026-08-08", recurrence: "daily" });
  assert.equal(itemOccursOnDate(daily, "2026-08-07", today), false);
  assert.equal(itemOccursOnDate(daily, "2026-08-09", today), true);

  const weekdays = item({ dateISO: "2026-08-07", recurrence: "weekdays" });
  assert.equal(itemOccursOnDate(weekdays, "2026-08-08", today), false);
  assert.equal(itemOccursOnDate(weekdays, "2026-08-10", today), true);
});

test("uma ocorrência concluída desaparece apenas nesse dia", () => {
  const task = item({
    dateISO: "2026-08-08",
    recurrence: "daily",
    occurrenceStates: { "2026-08-08": "Feito" },
  });

  assert.equal(isOccurrenceFinished(task, "2026-08-08"), true);
  assert.equal(isOccurrenceFinished(task, "2026-08-09"), false);
});

test("uma recorrência anual só entra na lista ativa na véspera e no próprio dia", () => {
  const birthday = item({ dateISO: "1990-08-10", recurrence: "yearly" });

  assert.equal(isItemVisibleInActiveList(birthday, "2026-08-08"), false);
  assert.equal(isItemVisibleInActiveList(birthday, "2026-08-09"), true);
  assert.equal(isItemVisibleInActiveList(birthday, "2026-08-10"), true);
  assert.equal(isItemVisibleInActiveList(birthday, "2026-08-11"), false);
});

test("a antecedência anual funciona na passagem de ano", () => {
  const birthday = item({ dateISO: "1990-01-01", recurrence: "yearly" });
  assert.equal(isItemVisibleInActiveList(birthday, "2026-12-31"), true);
});

test("uma ocorrência anual concluída desaparece durante o próprio dia", () => {
  const birthday = item({
    dateISO: "1990-08-10",
    recurrence: "yearly",
    occurrenceStates: { "2026-08-10": "Feito" },
  });

  assert.equal(isItemVisibleInActiveList(birthday, "2026-08-10"), false);
});

test("calcula o próximo aniversário e salta ocorrências já concluídas", () => {
  const birthday = item({
    dateISO: "1990-08-10",
    recurrence: "yearly",
    occurrenceStates: { "2026-08-10": "Feito" },
  });

  assert.equal(nextBirthdayOccurrenceISO(birthday, "2026-08-09"), "2027-08-10");
  assert.equal(daysBetweenISO("2026-08-09", "2027-08-10"), 366);
});

test("o próximo aniversário respeita anos bissextos", () => {
  const birthday = item({ dateISO: "2020-02-29", recurrence: "yearly" });
  assert.equal(nextBirthdayOccurrenceISO(birthday, "2026-01-01"), "2028-02-29");
});
