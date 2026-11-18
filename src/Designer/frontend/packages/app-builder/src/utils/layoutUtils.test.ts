import { describe, expect, it } from 'vitest';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { LayoutComponent, PageLayout } from '../types';
import {
  getComponentAndDescendantIds,
  getTopLevelComponents,
  insertComponent,
  moveComponent,
  removeComponent,
  setRequired,
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

  it('inserts the component before the top-level component at the position', () => {
    const layout = createLayout([heading, group, groupChild, input]);
    expect(getIds(insertComponent(layout, newComponent, 2))).toEqual([
      'heading',
      'group',
      'groupChild',
      'new',
      'input',
    ]);
  });

  it('adds the component last when the position is past the end', () => {
    const layout = createLayout([heading]);
    expect(getIds(insertComponent(layout, newComponent, 5))).toEqual(['heading', 'new']);
  });

  it('adds the component to an empty page', () => {
    expect(getIds(insertComponent(createLayout([]), newComponent, 0))).toEqual(['new']);
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

describe('setRequired', () => {
  it('makes a component required', () => {
    const updated = setRequired(createLayout([heading, input]), 'input', true);
    expect(updated.data.layout[1]).toEqual({ ...input, required: true });
  });

  it('leaves out the property when the component is made optional', () => {
    const updated = setRequired(createLayout([{ ...input, required: true }]), 'input', false);
    expect(updated.data.layout[0]).toEqual(input);
  });
});
