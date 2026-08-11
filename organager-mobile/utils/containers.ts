import type { ContainerItem } from "../types";

export function isUnassignedContainer(container: ContainerItem) {
  return container.id.startsWith("unassigned-");
}

export function sortContainers(containers: ContainerItem[]) {
  return containers
    .map((container, originalIndex) => ({ container, originalIndex }))
    .sort((entryA, entryB) => {
      const aUnassigned = isUnassignedContainer(entryA.container);
      const bUnassigned = isUnassignedContainer(entryB.container);
      if (aUnassigned !== bUnassigned) return aUnassigned ? 1 : -1;

      const orderA = entryA.container.order ?? entryA.originalIndex;
      const orderB = entryB.container.order ?? entryB.originalIndex;
      return orderA - orderB || entryA.originalIndex - entryB.originalIndex;
    })
    .map(({ container }) => container);
}

export function moveContainerId(
  orderedIds: string[],
  containerId: string,
  direction: "up" | "down"
) {
  const index = orderedIds.indexOf(containerId);
  const adjacentIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || adjacentIndex < 0 || adjacentIndex >= orderedIds.length) {
    return orderedIds.slice();
  }

  const next = orderedIds.slice();
  [next[index], next[adjacentIndex]] = [next[adjacentIndex], next[index]];
  return next;
}
