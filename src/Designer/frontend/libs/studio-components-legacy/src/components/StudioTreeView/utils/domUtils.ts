import { StringUtils } from 'libs/studio-pure-functions/src';

export const makeDomTreeItemId = (rootId: string, id: string) => `${rootId}-${id}-treeitem`;

export const extractIdFromTreeItem = (rootId: string, id?: string) =>
  id ? StringUtils.removeEnd(StringUtils.removeStart(id, rootId + '-'), '-treeitem') : undefined;

export const makeDomGroupId = (rootId: string, id: string) => `${rootId}-${id}-group`;

export const extractIdFromGroup = (rootId: string, id?: string) =>
  id ? StringUtils.removeEnd(StringUtils.removeStart(id, rootId + '-'), '-group') : undefined;

export const findTreeItem = (rootId: string, id: string) =>
  document.getElementById(makeDomTreeItemId(rootId, id));

export const findGroup = (rootId: string, id: string) =>
  document.getElementById(makeDomGroupId(rootId, id));

const findItemLevel = (rootId: string, nodeId?: string): number =>
  nodeId ? parseInt(findTreeItem(rootId, nodeId)?.getAttribute('aria-level')) : 0;

export const isDirectChildOfNode = (
  childId: string,
  rootId: string,
  parentId?: string,
): boolean => {
  return findDirectChildIds(rootId, parentId).includes(childId);
};

export const findDirectChildIds = (rootId: string, nodeId?: string): string[] => {
  const list = nodeId ? findGroup(rootId, nodeId) : document.getElementById(rootId);
  if (!list) return [];
  const level = findItemLevel(rootId, nodeId);
  const childItems = list.querySelectorAll(`[role="treeitem"][aria-level="${level + 1}"]`);
  return Array.from(childItems).map((item) => extractIdFromTreeItem(rootId, item.id));
};

export const findParentId = (rootId: string, nodeId: string): string | null => {
  const item = findTreeItem(rootId, nodeId);
  const parentItem = item.closest(`[role="group"], [role="tree"]`);
  const { id } = parentItem;
  return id === rootId ? null : extractIdFromGroup(rootId, id);
};

export const findAllParentIds = (rootId: string, nodeId: string): string[] => {
  const parentIds = [];
  let parentId = findParentId(rootId, nodeId);
  while (parentId) {
    parentIds.push(parentId);
    parentId = findParentId(rootId, parentId);
  }
  return parentIds;
};

export const findAllNodeIds = (rootId: string): string[] => {
  const root = document.getElementById(rootId);
  const items = root.querySelectorAll('[role="treeitem"]');
  return Array.from(items).map((item) => extractIdFromTreeItem(rootId, item.id));
};

const isNodeVisible = (rootId: string, nodeId: string): boolean => {
  const parentIds = findAllParentIds(rootId, nodeId);
  return parentIds.every((id) => {
    const treeItem = findTreeItem(rootId, id);
    return treeItem && treeItem.getAttribute('aria-expanded') === 'true';
  });
};

export const findAllVisibleNodeIds = (rootId: string): string[] =>
  findAllNodeIds(rootId).filter((id) => isNodeVisible(rootId, id));

export const findNextVisibleNodeId = (rootId: string, nodeId: string): string | null => {
  const visibleNodeIds = findAllVisibleNodeIds(rootId);
  const index = visibleNodeIds.indexOf(nodeId);
  return visibleNodeIds[index + 1] || null;
};

export const findPreviousVisibleNodeId = (rootId: string, nodeId: string): string | null => {
  const visibleNodeIds = findAllVisibleNodeIds(rootId);
  const index = visibleNodeIds.indexOf(nodeId);
  return visibleNodeIds[index - 1] || null;
};

export const findFirstNodeId = (rootId: string): string | null => {
  const nodeIds = findAllNodeIds(rootId);
  return nodeIds[0] || null;
};

export const findLastVisibleNodeId = (rootId: string): string | null => {
  const visibleNodeIds = findAllVisibleNodeIds(rootId);
  return visibleNodeIds[visibleNodeIds.length - 1] || null;
};

export const findNodeIndexWithinGroup = (rootId: string, nodeId: string): number => {
  const parentId = findParentId(rootId, nodeId);
  const sameLevelIds = findDirectChildIds(rootId, parentId);
  return sameLevelIds.indexOf(nodeId);
};

export const hasChildNodes = (rootId: string, nodeId: string): boolean => {
  const childIds = findDirectChildIds(rootId, nodeId);
  return childIds.length > 0;
};

export const findFirstChildId = (rootId: string, nodeId: string): string | null => {
  const childIds = findDirectChildIds(rootId, nodeId);
  return childIds[0] || null;
};
