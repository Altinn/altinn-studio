import type { DragItem } from './dnd-helpers';
import { dropTargetSpec, itemType } from './dnd-helpers';

test('that dropTargetSpec works', () => {
  const targetItem: DragItem = {
    containerId: 'dfasd',
    index: 0,
    itemId: 'gadfsa',
  };

  const moveThing = jest.fn();
  const { hover, collect, accept } = dropTargetSpec(targetItem, null, moveThing);
  expect(typeof hover).toBe('function');
  expect(typeof collect).toBe('function');
  expect(accept).toBe(itemType);
});
