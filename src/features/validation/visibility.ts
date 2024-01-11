import { getInitialMaskFromNode } from 'src/features/validation/utils';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { CompGroupRepeatingInternal } from 'src/layout/Group/config.generated';
import type { LayoutNodeForGroup } from 'src/layout/Group/LayoutNodeForGroup';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export type Visibility = {
  mask: number;
  children: {
    [key: string]: Visibility | undefined;
  };
  items: (Visibility | undefined)[];
};

type PathItem = string | number;

/**
 * Gets a nodes path from the root visibility
 */
function getPathFromRoot(node: LayoutNode | LayoutPage): PathItem[] {
  const path: PathItem[] = [];
  let currentNode: LayoutNode | LayoutPage = node;
  while (typeof currentNode !== 'undefined') {
    if (currentNode instanceof BaseLayoutNode) {
      const key = currentNode.item.baseComponentId ?? currentNode.item.id;
      path.push(key);

      if (typeof currentNode.rowIndex !== 'undefined') {
        path.push(currentNode.rowIndex);
      }
    }

    if (currentNode instanceof LayoutPage) {
      path.push(currentNode.top.myKey);
    }

    currentNode = currentNode.parent;
  }

  return path.reverse();
}

function getChildVisibility(visibility: Visibility, key: PathItem): Visibility | undefined {
  if (typeof key === 'number') {
    return visibility.items[key];
  } else {
    return visibility.children[key];
  }
}

function setChildVisibility(visibility: Visibility, key: PathItem, child: Visibility | undefined): void {
  if (typeof key === 'number') {
    visibility.items[key] = child;
  } else {
    visibility.children[key] = child;
  }
}

function deleteChildVisibility(visibility: Visibility, key: PathItem): void {
  if (typeof key === 'number') {
    delete visibility.items[key];
  } else {
    delete visibility.children[key];
  }
}

export function addVisibilityForNode(node: LayoutNode, state: Visibility): void {
  const path = getPathFromRoot(node);
  const initialMask = getInitialMaskFromNode(node);

  // Make sure each node in the path is defined, if not initialize to zero
  // It should get set to its proper initial value once it is explicitly set
  let currentVisibility: Visibility = state;
  for (const key of path.slice(0, -1)) {
    if (!getChildVisibility(currentVisibility, key)) {
      setChildVisibility(currentVisibility, key, {
        mask: 0,
        children: {},
        items: [],
      });
    }
    currentVisibility = getChildVisibility(currentVisibility, key)!;
  }

  // Set the visibility for the node to its initial mask
  const key = path.at(-1)!;
  const nodeVisibility = getChildVisibility(currentVisibility, key);
  if (!nodeVisibility) {
    setChildVisibility(currentVisibility, key, {
      mask: initialMask,
      children: {},
      items: [],
    });
  } else {
    nodeVisibility.mask = initialMask;
  }
}

export function removeVisibilityForNode(node: LayoutNode, state: Visibility): void {
  const path = getPathFromRoot(node);
  const pathToParent = path.slice(0, -1);
  const key = path.at(-1)!;

  // The parent of a node will always be an object
  const parentVisibility = getVisibilityFromPath(pathToParent, state);
  if (parentVisibility) {
    deleteChildVisibility(parentVisibility, key);

    // If all children are removed from a list row, remove the list row visibility
    const parentKey = pathToParent.at(-1);
    // If the parentkey is a number, then the parent will only have children (not items), since rows are never directly nested. It must go through a nested group child.
    if (typeof parentKey === 'number' && Object.keys(parentVisibility.children).length === 0) {
      const grandParentVisibility = getVisibilityFromPath(pathToParent.slice(0, -1), state);
      if (grandParentVisibility) {
        deleteChildVisibility(grandParentVisibility, parentKey);
      }
    }
  }
}

export function addVisibilityForAttachment(attachmentId: string, node: LayoutNode, state: Visibility): void {
  const path = getPathFromRoot(node);
  let nodeVisibility = getVisibilityFromPath(path, state);
  if (!nodeVisibility) {
    addVisibilityForNode(node, state);
    nodeVisibility = getVisibilityFromPath(path, state)!;
  }
  nodeVisibility.children[attachmentId] = {
    mask: 0,
    children: {},
    items: [],
  };
}

export function removeVisibilityForAttachment(attachmentId: string, node: LayoutNode, state: Visibility): void {
  const path = getPathFromRoot(node);
  const nodeVisibility = getVisibilityFromPath(path, state);
  if (!nodeVisibility) {
    return;
  }
  deleteChildVisibility(nodeVisibility, attachmentId);
}

export function onBeforeRowDelete(
  groupNode: LayoutNodeForGroup<CompGroupRepeatingInternal>,
  rowIndex: number,
  state: Visibility,
) {
  const path = getPathFromRoot(groupNode);
  const groupVisibility = getVisibilityFromPath(path, state);
  groupVisibility?.items.splice(rowIndex, 1);
}

function getVisibilityFromPath(path: PathItem[], state: Visibility): Visibility | undefined {
  let currentVisibility: Visibility = state;
  for (const key of path) {
    const nextVisibility = getChildVisibility(currentVisibility, key);

    if (!nextVisibility) {
      return undefined;
    }
    currentVisibility = nextVisibility;
  }
  return currentVisibility;
}

export function getVisibilityForNode(node: LayoutNode, state: Visibility): number {
  const path = getPathFromRoot(node);
  const visibility = getVisibilityFromPath(path, state);
  return visibility?.mask ?? 0;
}

export function getResolvedVisibilityForAttachment(attachmentId: string, node: LayoutNode, state: Visibility): number {
  let mask = getVisibilityForNode(node, state);
  const path = getPathFromRoot(node);
  const nodeVisibility = getVisibilityFromPath(path, state);
  if (!nodeVisibility) {
    return mask;
  }
  const attachmentVisibility = getChildVisibility(nodeVisibility, attachmentId);
  if (attachmentVisibility) {
    mask |= attachmentVisibility.mask;
  }
  return mask;
}

export function setVisibilityForNode(
  node: LayoutNode | LayoutPage,
  state: Visibility,
  mask: number,
  rowIndex?: number,
): void {
  const path = getPathFromRoot(node);
  if (typeof rowIndex !== 'undefined') {
    path.push(rowIndex);
  }
  const visibility = getVisibilityFromPath(path, state);

  if (!visibility) {
    const keys = path.join(' -> ');
    window.logWarn(`Set node validation visibility: Could not find visibility for ${keys}`);
    return;
  }

  const initialMask = getInitialMaskFromNode(node);

  visibility.mask = mask | initialMask;
}

export function setVisibilityForAttachment(attachmentId: string, node: LayoutNode, state: Visibility, mask: number) {
  const path = getPathFromRoot(node);
  path.push(attachmentId);

  const visibility = getVisibilityFromPath(path, state);

  if (!visibility) {
    const keys = path.join(' -> ');
    window.logWarn(`Set attachment validation visibility: Could not find visibility for ${keys}`);
    return;
  }

  visibility.mask = mask;
}
