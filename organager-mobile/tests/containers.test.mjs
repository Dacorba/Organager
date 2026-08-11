import assert from "node:assert/strict";
import test from "node:test";

import { moveContainerId, sortContainers } from "../utils/containers.ts";

function container(id, overrides = {}) {
  return {
    id,
    workspaceId: "rovisys",
    type: "project",
    name: id,
    ...overrides,
  };
}

test("Sem projeto fica sempre no fim", () => {
  const containers = [
    container("unassigned-rovisys", { name: "Sem projeto" }),
    container("segundo", { order: 1 }),
    container("primeiro", { order: 0 }),
  ];

  assert.deepEqual(
    sortContainers(containers).map(({ id }) => id),
    ["primeiro", "segundo", "unassigned-rovisys"]
  );
});

test("projetos antigos sem ordem mantêm a posição original", () => {
  assert.deepEqual(
    sortContainers([container("a"), container("b")]).map(({ id }) => id),
    ["a", "b"]
  );
});

test("um projeto pode subir ou descer na ordem", () => {
  assert.deepEqual(moveContainerId(["a", "b", "c"], "b", "up"), [
    "b",
    "a",
    "c",
  ]);
  assert.deepEqual(moveContainerId(["a", "b", "c"], "b", "down"), [
    "a",
    "c",
    "b",
  ]);
});

test("não é possível mover para além dos limites", () => {
  assert.deepEqual(moveContainerId(["a", "b"], "a", "up"), ["a", "b"]);
  assert.deepEqual(moveContainerId(["a", "b"], "b", "down"), ["a", "b"]);
});
