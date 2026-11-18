import type { LayoutComponent, PageLayout } from '../types';

/**
 * Returns the components that sit directly on the page, in order. Components listed as children of
 * a container are left out, since the container is responsible for showing them.
 */
export function getTopLevelComponents(layout: PageLayout): LayoutComponent[] {
  const components = layout.data.layout;
  const childIds = new Set(components.flatMap((component) => getChildIds(component)));
  return components.filter((component) => !childIds.has(component.id));
}

function getChildIds(component: LayoutComponent): string[] {
  return Array.isArray(component.children) ? component.children : [];
}

/**
 * Inserts a component at the given position among the components on the page, and returns a new
 * layout. A position at or past the end adds the component last.
 */
export function insertComponent(
  layout: PageLayout,
  component: LayoutComponent,
  position: number,
): PageLayout {
  const topLevelComponents = getTopLevelComponents(layout);
  const componentAtPosition = topLevelComponents[position];
  const components = [...layout.data.layout];
  const insertIndex = componentAtPosition
    ? components.findIndex(({ id }) => id === componentAtPosition.id)
    : components.length;
  components.splice(insertIndex, 0, component);
  return { ...layout, data: { ...layout.data, layout: components } };
}

/**
 * Moves a component one or more places up (negative offset) or down (positive offset) among the
 * components on the page, and returns a new layout. The layout is returned unchanged if the move
 * would go past the first or last component.
 */
export function moveComponent(layout: PageLayout, componentId: string, offset: number): PageLayout {
  const topLevelIds = getTopLevelComponents(layout).map((component) => component.id);
  const fromIndex = topLevelIds.indexOf(componentId);
  const toIndex = fromIndex + offset;
  if (fromIndex === -1 || toIndex < 0 || toIndex >= topLevelIds.length) return layout;

  const targetId = topLevelIds[toIndex];
  const components = layout.data.layout.filter((component) => component.id !== componentId);
  const movedComponent = layout.data.layout.find((component) => component.id === componentId);
  const targetIndex = components.findIndex((component) => component.id === targetId);
  const insertIndex = offset > 0 ? targetIndex + 1 : targetIndex;
  components.splice(insertIndex, 0, movedComponent);

  return { ...layout, data: { ...layout.data, layout: components } };
}

/**
 * Removes a component from the page and returns a new layout. A container's children are removed
 * with it, so no component is left that nothing shows.
 */
export function removeComponent(layout: PageLayout, componentId: string): PageLayout {
  const idsToRemove = getComponentAndDescendantIds(layout, componentId);
  const components = layout.data.layout.filter(({ id }) => !idsToRemove.has(id));
  return { ...layout, data: { ...layout.data, layout: components } };
}

/** Returns the ID of the component and of every component inside it. */
export function getComponentAndDescendantIds(layout: PageLayout, componentId: string): Set<string> {
  const ids = new Set<string>([componentId]);
  const addChildren = (id: string): void => {
    const component = layout.data.layout.find((candidate) => candidate.id === id);
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

/**
 * Makes a component required or optional, and returns a new layout. Optional is the default, so the
 * property is left out rather than set to false.
 */
export function setRequired(
  layout: PageLayout,
  componentId: string,
  required: boolean,
): PageLayout {
  const components = layout.data.layout.map((component) => {
    if (component.id !== componentId) return component;
    const { required: _previous, ...rest } = component;
    return required ? { ...rest, required: true } : rest;
  });
  return { ...layout, data: { ...layout.data, layout: components } };
}
