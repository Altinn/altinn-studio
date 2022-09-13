import React, { createRef } from 'react';
import {
  createMockedDndEvents,
  createMockMonitor,
} from './helpers/dnd-helpers.test';
import { render, screen } from '@testing-library/react';
import { DndProvider, DropTargetMonitor } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { randomUUID } from 'crypto';
import {
  DroppableDraggableContainer,
  dropTargetSpec as createDropTargetSpec,
} from './DroppableDraggableContainer';
import { ItemType } from './helpers/dnd-types';

test('that DroppableDraggableContainer gets rendered', () => {
  const events = createMockedDndEvents();
  render(
    <DndProvider backend={HTML5Backend}>
      <DroppableDraggableContainer
        index={2}
        dndEvents={events}
        canDrag
        id={randomUUID()}
        isBaseContainer={false}
      />
    </DndProvider>,
  );
  expect(screen.getByTestId('droppable-draggable-container')).toBeDefined();
});

test("that DroppableDraggableContainer's droptarget spec is working", () => {
  const events = createMockedDndEvents();
  const monitor = createMockMonitor(true, ItemType.Item) as DropTargetMonitor;

  const dropTargetSpec = createDropTargetSpec(
    {
      id: randomUUID(),
      containerId: randomUUID(),
      type: ItemType.Container,
    },
    events,
    createRef(),
  );
  expect(dropTargetSpec.accept).toStrictEqual(Object.values(ItemType));

  dropTargetSpec.hover(
    {
      id: randomUUID(),
      index: 0,
      type: ItemType.Item,
      containerId: randomUUID(),
    },
    monitor,
  );
  expect(events.moveItem).not.toBeCalled();
  expect(dropTargetSpec.collect(monitor)).toStrictEqual({
    isOver: true,
  });
});
