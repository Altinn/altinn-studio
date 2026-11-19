import { ComponentType } from 'app-shared/types/ComponentType';
import type { LayoutComponent, PageLayout } from '../types';

/** Where a new component goes on the page. */
export type Placement =
  { kind: 'before'; componentId: string } | { kind: 'inGroup'; groupId: string } | { kind: 'end' };

export type ComponentWidth = 'full' | 'half';

const halfWidthGrid = { xs: 12, md: 6 };
const halfColumns = 6;

/**
 * Returns the components that sit directly on the page, in order. Components listed as children of
 * a container are left out, since the container is responsible for showing them.
 */
export function getTopLevelComponents(layout: PageLayout): LayoutComponent[] {
  const components = layout.data.layout;
  const childIds = new Set(components.flatMap((component) => getChildIds(component)));
  return components.filter((component) => !childIds.has(component.id));
}

/** Returns the children of a container in the order it shows them. */
export function getChildComponents(
  layout: PageLayout,
  container: LayoutComponent,
): LayoutComponent[] {
  return getChildIds(container)
    .map((childId) => findComponent(layout, childId))
    .filter((child): child is LayoutComponent => Boolean(child));
}

export function findComponent(
  layout: PageLayout,
  componentId: string,
): LayoutComponent | undefined {
  return layout.data.layout.find(({ id }) => id === componentId);
}

/** Returns the group that lists the component as a child, if any. */
export function findParentGroup(
  layout: PageLayout,
  componentId: string,
): LayoutComponent | undefined {
  return layout.data.layout.find((component) => getChildIds(component).includes(componentId));
}

export function isGroup(component: LayoutComponent): boolean {
  return component.type === ComponentType.Group;
}

function getChildIds(component: LayoutComponent): string[] {
  return Array.isArray(component.children) ? component.children : [];
}

/**
 * Inserts a component and returns a new layout. A group takes it as its last child. Components the
 * builder keeps in place, such as the navigation buttons, stay below what is added at the end.
 */
export function insertComponent(
  layout: PageLayout,
  component: LayoutComponent,
  placement: Placement,
  fixedIds: Set<string> = new Set(),
): PageLayout {
  const target = getInsertTarget(layout, placement, fixedIds);
  const components = [...layout.data.layout];
  components.splice(target.layoutIndex, 0, component);
  const updated = withComponents(layout, components);
  if (!target.group) return updated;
  return updateComponent(updated, target.group.id, (group) => {
    const childIds = [...getChildIds(group)];
    childIds.splice(target.childIndex, 0, component.id);
    return { ...group, children: childIds };
  });
}

type InsertTarget = {
  /** Where the component goes in the layout file. */
  layoutIndex: number;
  group?: LayoutComponent;
  /** Where the component goes among the group's children. */
  childIndex?: number;
};

function getInsertTarget(
  layout: PageLayout,
  placement: Placement,
  fixedIds: Set<string>,
): InsertTarget {
  const components = layout.data.layout;
  const indexOf = (componentId: string): number =>
    components.findIndex(({ id }) => id === componentId);

  if (placement.kind === 'end') {
    // After the last component the user placed, so it shows last whether the components the builder
    // keeps in place come before or after it in the file.
    const lastPlacedIndex = components.findLastIndex(({ id }) => !fixedIds.has(id));
    return { layoutIndex: lastPlacedIndex + 1 };
  }

  if (placement.kind === 'inGroup') {
    const group = findComponent(layout, placement.groupId);
    const childIds = getChildIds(group);
    const lastId = childIds[childIds.length - 1] ?? placement.groupId;
    return { layoutIndex: indexOf(lastId) + 1, group, childIndex: childIds.length };
  }

  const group = findParentGroup(layout, placement.componentId);
  const layoutIndex = indexOf(placement.componentId);
  if (!group) return { layoutIndex };
  const childIndex = getChildIds(group).indexOf(placement.componentId);
  return { layoutIndex, group, childIndex };
}

/**
 * Moves a component one place up (-1) or down (1) among its siblings: the components on the page, or
 * the children of its group. Components the builder keeps in place are not siblings, so nothing moves
 * past them. The layout is returned unchanged if the move would go past the ends.
 */
export function moveComponent(
  layout: PageLayout,
  componentId: string,
  offset: number,
  fixedIds: Set<string> = new Set(),
): PageLayout {
  const group = findParentGroup(layout, componentId);
  if (group) {
    const currentChildIds = getChildIds(group);
    const childIds = moveItem(currentChildIds, componentId, offset);
    if (childIds === currentChildIds) return layout;
    return updateComponent(layout, group.id, (current) => ({ ...current, children: childIds }));
  }

  const topLevelIds = getTopLevelComponents(layout)
    .map(({ id }) => id)
    .filter((id) => !fixedIds.has(id));
  const fromIndex = topLevelIds.indexOf(componentId);
  const toIndex = fromIndex + offset;
  if (fromIndex === -1 || toIndex < 0 || toIndex >= topLevelIds.length) return layout;

  const targetId = topLevelIds[toIndex];
  const movedComponent = findComponent(layout, componentId);
  const components = layout.data.layout.filter(({ id }) => id !== componentId);
  const targetIndex = components.findIndex(({ id }) => id === targetId);
  components.splice(offset > 0 ? targetIndex + 1 : targetIndex, 0, movedComponent);
  return withComponents(layout, components);
}

function moveItem(items: string[], item: string, offset: number): string[] {
  const fromIndex = items.indexOf(item);
  const toIndex = fromIndex + offset;
  if (fromIndex === -1 || toIndex < 0 || toIndex >= items.length) return items;
  const moved = [...items];
  moved.splice(fromIndex, 1);
  moved.splice(toIndex, 0, item);
  return moved;
}

/** Whether the component can move one place up (-1) or down (1) among its siblings. */
export function canMoveComponent(
  layout: PageLayout,
  componentId: string,
  offset: number,
  fixedIds: Set<string> = new Set(),
): boolean {
  return moveComponent(layout, componentId, offset, fixedIds) !== layout;
}

/**
 * Removes a component from the page and returns a new layout. A container's children are removed
 * with it, so no component is left that nothing shows, and its group no longer lists it.
 */
export function removeComponent(layout: PageLayout, componentId: string): PageLayout {
  const idsToRemove = getComponentAndDescendantIds(layout, componentId);
  const components = layout.data.layout
    .filter(({ id }) => !idsToRemove.has(id))
    .map((component) =>
      getChildIds(component).includes(componentId)
        ? { ...component, children: getChildIds(component).filter((id) => id !== componentId) }
        : component,
    );
  return withComponents(layout, components);
}

/** Returns the ID of the component and of every component inside it. */
export function getComponentAndDescendantIds(layout: PageLayout, componentId: string): Set<string> {
  const ids = new Set<string>([componentId]);
  const addChildren = (id: string): void => {
    const component = findComponent(layout, id);
    if (!component) return;
    getChildIds(component).forEach((childId) => {
      if (ids.has(childId)) return;
      ids.add(childId);
      addChildren(childId);
    });
  };
  addChildren(componentId);
  return ids;
}

/** Replaces one component with what the update returns, and returns a new layout. */
export function updateComponent(
  layout: PageLayout,
  componentId: string,
  update: (component: LayoutComponent) => LayoutComponent,
): PageLayout {
  return withComponents(
    layout,
    layout.data.layout.map((component) =>
      component.id === componentId ? update(component) : component,
    ),
  );
}

/**
 * Sets a property, or removes it when the value is undefined, so the layout file keeps only what
 * differs from the defaults.
 */
export function setProperty(
  component: LayoutComponent,
  property: string,
  value: unknown,
): LayoutComponent {
  const { [property]: _previous, ...rest } = component;
  const remaining = rest as LayoutComponent;
  return value === undefined ? remaining : { ...remaining, [property]: value };
}

export function getWidth(component: LayoutComponent): ComponentWidth {
  const { xs: _xs, ...widerBreakpoints } = component.grid ?? {};
  return Object.values(widerBreakpoints).includes(halfColumns) ? 'half' : 'full';
}

export function setWidth(component: LayoutComponent, width: ComponentWidth): LayoutComponent {
  return setProperty(component, 'grid', width === 'half' ? halfWidthGrid : undefined);
}

/** Replaces the layout's components and returns a new layout. */
export function withComponents(layout: PageLayout, components: LayoutComponent[]): PageLayout {
  return { ...layout, data: { ...layout.data, layout: components } };
}

/** Returns all components in all the given pages. */
export function getAllComponents(layouts: Record<string, PageLayout>): LayoutComponent[] {
  return Object.values(layouts).flatMap((layout) => layout.data.layout);
}
