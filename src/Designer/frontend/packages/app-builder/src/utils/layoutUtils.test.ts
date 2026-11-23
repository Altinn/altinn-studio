import { describe, expect, it } from 'vitest';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { LayoutComponent, PageLayout } from '../types';
import {
  getComponentAndDescendantIds,
  getTopLevelComponents,
  insertComponent,
  moveComponent,
  removeComponent,
  setWidth,
  getWidth,
  canMoveComponent,
} from './layoutUtils';

const heading: LayoutComponent = { id: 'heading', type: ComponentType.Heading };
const group: LayoutComponent = { id: 'group', type: ComponentType.Group, children: ['groupChild'] };
const groupChild: LayoutComponent = { id: 'groupChild', type: ComponentType.Input };
const input: LayoutComponent = { id: 'input', type: ComponentType.Input };

const createLayout = (components: LayoutComponent[]): PageLayout => ({
  $schema: 'schema',
  data: { layout: components },
});

const getIds = (layout: PageLayout): string[] => layout.data.layout.map(({ id }) => id);

describe('getTopLevelComponents', () => {
  it('leaves out components that are children of a container', () => {
    const layout = createLayout([heading, group, groupChild, input]);
    expect(getTopLevelComponents(layout)).toEqual([heading, group, input]);
  });
});

describe('moveComponent', () => {
  it('moves a component down past the next top-level component', () => {
    const layout = createLayout([heading, input, group, groupChild]);
    expect(getIds(moveComponent(layout, 'input', 1))).toEqual([
      'heading',
      'group',
      'input',
      'groupChild',
    ]);
  });

  it('moves a component up past the previous top-level component', () => {
    const layout = createLayout([heading, group, groupChild, input]);
    expect(getIds(moveComponent(layout, 'input', -1))).toEqual([
      'heading',
      'input',
      'group',
      'groupChild',
    ]);
  });

  it('returns the layout unchanged when the component is already first', () => {
    const layout = createLayout([heading, input]);
    expect(moveComponent(layout, 'heading', -1)).toBe(layout);
  });

  it('returns the layout unchanged when the component is already last', () => {
    const layout = createLayout([heading, input]);
    expect(moveComponent(layout, 'input', 1)).toBe(layout);
  });

  it('keeps the other properties of the layout', () => {
    const layout: PageLayout = {
      ...createLayout([heading, input]),
      data: { layout: [heading, input], hidden: true },
    };
    const movedLayout = moveComponent(layout, 'input', -1);
    expect(movedLayout.$schema).toBe('schema');
    expect(movedLayout.data.hidden).toBe(true);
  });
});

describe('insertComponent', () => {
  const newComponent: LayoutComponent = { id: 'new', type: ComponentType.Paragraph };

  it('inserts the component before another', () => {
    const layout = createLayout([heading, group, groupChild, input]);
    const updated = insertComponent(layout, newComponent, { kind: 'before', componentId: 'input' });
    expect(getIds(updated)).toEqual(['heading', 'group', 'groupChild', 'new', 'input']);
  });

  it('adds the component last on the page', () => {
    const updated = insertComponent(createLayout([heading]), newComponent, { kind: 'end' });
    expect(getIds(updated)).toEqual(['heading', 'new']);
  });

  it('adds the component as the last child of a group', () => {
    const layout = createLayout([group, groupChild, input]);
    const updated = insertComponent(layout, newComponent, { kind: 'inGroup', groupId: 'group' });
    expect(getIds(updated)).toEqual(['group', 'groupChild', 'new', 'input']);
    expect(updated.data.layout[0].children).toEqual(['groupChild', 'new']);
  });

  it('adds the component to the group of the component it goes before', () => {
    const layout = createLayout([group, groupChild]);
    const placement = { kind: 'before', componentId: 'groupChild' } as const;
    const updated = insertComponent(layout, newComponent, placement);
    expect(updated.data.layout[0].children).toEqual(['new', 'groupChild']);
  });
});

describe('moveComponent in a group', () => {
  it('moves a child among the children of its group', () => {
    const second: LayoutComponent = { id: 'second', type: ComponentType.Input };
    const layout = createLayout([
      { ...group, children: ['groupChild', 'second'] },
      groupChild,
      second,
    ]);
    expect(moveComponent(layout, 'second', -1).data.layout[0].children).toEqual([
      'second',
      'groupChild',
    ]);
  });
});

describe('removeComponent', () => {
  it('removes the component', () => {
    const layout = createLayout([heading, input]);
    expect(getIds(removeComponent(layout, 'heading'))).toEqual(['input']);
  });

  it('removes a container together with its children', () => {
    const layout = createLayout([heading, group, groupChild, input]);
    expect(getIds(removeComponent(layout, 'group'))).toEqual(['heading', 'input']);
  });
});

describe('getComponentAndDescendantIds', () => {
  it('returns the component and the components inside it', () => {
    const layout = createLayout([heading, group, groupChild]);
    expect(Array.from(getComponentAndDescendantIds(layout, 'group'))).toEqual([
      'group',
      'groupChild',
    ]);
  });
});

describe('getWidth and setWidth', () => {
  it('makes a component half as wide on wider screens, and back', () => {
    const half = setWidth(input, 'half');
    expect(half.grid).toEqual({ xs: 12, md: 6 });
    expect(getWidth(half)).toBe('half');
    expect(setWidth(half, 'full')).not.toHaveProperty('grid');
  });
});

describe('removeComponent from a group', () => {
  it('removes the child from the children of its group', () => {
    const layout = createLayout([group, groupChild]);
    expect(removeComponent(layout, 'groupChild').data.layout[0].children).toEqual([]);
  });
});

describe('components the builder keeps in place', () => {
  const navigation: LayoutComponent = { id: 'navigation', type: ComponentType.NavigationButtons };
  const fixedIds = new Set(['navigation']);

  it('adds a component at the end above them', () => {
    const newComponent: LayoutComponent = { id: 'new', type: ComponentType.Paragraph };
    const layout = createLayout([heading, navigation]);
    expect(getIds(insertComponent(layout, newComponent, { kind: 'end' }, fixedIds))).toEqual([
      'heading',
      'new',
      'navigation',
    ]);
  });

  it('adds a component at the end below them when they come first in the file', () => {
    const newComponent: LayoutComponent = { id: 'new', type: ComponentType.Paragraph };
    const layout = createLayout([navigation, heading]);
    expect(getIds(insertComponent(layout, newComponent, { kind: 'end' }, fixedIds))).toEqual([
      'navigation',
      'heading',
      'new',
    ]);
  });

  it('does not move a component past them', () => {
    const layout = createLayout([heading, input, navigation]);
    expect(canMoveComponent(layout, 'input', 1, fixedIds)).toBe(false);
    expect(canMoveComponent(layout, 'input', -1, fixedIds)).toBe(true);
  });

  it('does not move a child past the ends of its group', () => {
    const second: LayoutComponent = { id: 'second', type: ComponentType.Input };
    const layout = createLayout([
      { ...group, children: ['groupChild', 'second'] },
      groupChild,
      second,
    ]);
    expect(canMoveComponent(layout, 'groupChild', -1)).toBe(false);
    expect(canMoveComponent(layout, 'second', 1)).toBe(false);
    expect(moveComponent(layout, 'second', 1)).toBe(layout);
  });
});
