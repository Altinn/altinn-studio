export function getLabelId(nodeId: string) {
  return `label-${nodeId}`;
}

export function getDescriptionId(nodeId?: string) {
  if (!nodeId) {
    return undefined;
  }

  return `description-${getLabelId(nodeId)}`;
}
