import assert from "node:assert/strict";
import test from "node:test";

import {
  backupFileName,
  createBackup,
  createBackupJSON,
  parseBackupJSON,
} from "../utils/backup.ts";

function fixtures() {
  const containers = [
    {
      id: "unassigned-rovisys",
      workspaceId: "rovisys",
      type: "project",
      name: "Sem projeto",
    },
    {
      id: "unassigned-personal",
      workspaceId: "personal",
      type: "area",
      name: "Sem projeto",
    },
    {
      id: "proj-1",
      workspaceId: "rovisys",
      type: "project",
      name: "AMS-01",
      order: 0,
    },
    {
      id: "area-1",
      workspaceId: "personal",
      type: "area",
      name: "Casa",
      order: 0,
    },
  ];
  const items = [
    {
      id: "task-1",
      workspaceId: "personal",
      containerId: "area-1",
      title: "Comprar pão",
      description: "Comprar pão integral",
      category: "Task",
      state: "Novo",
      createdAt: "11/08/2026, 10:00",
      priority: "Alta",
      priorityOrder: 2,
      recurrence: "none",
    },
  ];
  return { containers, items };
}

test("cria e volta a ler um backup completo", () => {
  const { containers, items } = fixtures();
  const json = createBackupJSON(containers, items);
  const restored = parseBackupJSON(json);

  assert.equal(restored.app, "organager");
  assert.equal(restored.schemaVersion, 1);
  assert.deepEqual(restored.containers, containers);
  assert.deepEqual(restored.items, items);
  assert.equal("apiBaseUrl" in restored, false);
});

test("rejeita tarefas ligadas a projetos inexistentes", () => {
  const { containers, items } = fixtures();
  items[0].containerId = "missing";

  assert.throws(
    () => createBackup(containers, items),
    /aponta para um projeto inválido/
  );
});

test("rejeita identificadores duplicados e versões desconhecidas", () => {
  const { containers, items } = fixtures();
  assert.throws(
    () => createBackup(containers, [...items, { ...items[0] }]),
    /Tarefa duplicada/
  );

  const valid = createBackup(containers, items);
  assert.throws(
    () => parseBackupJSON(JSON.stringify({ ...valid, schemaVersion: 2 })),
    /versão.*não é suportada/i
  );
});

test("rejeita JSON inválido e gera nomes de ficheiro seguros", () => {
  assert.throws(() => parseBackupJSON("{não é json"), /JSON válido/);
  assert.equal(
    backupFileName(new Date("2026-08-11T12:34:56.789Z")),
    "organager-backup-2026-08-11T12-34-56-789Z.json"
  );
});
