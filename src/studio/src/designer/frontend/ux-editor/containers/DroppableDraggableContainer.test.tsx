import React, { createRef } from 'react';
import { createMockedDndEvents, createMockMonitor } from './helpers/dnd-helpers.test';
import { render, screen } from '@testing-library/react';
import type { DropTargetMonitor } from 'react-dnd';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { randomUUID } from 'crypto';
import { DroppableDraggableContainer, dropTargetSpec as createDropTargetSpec } from './DroppableDraggableContainer';
import { ItemType } from './helpers/dnd-types';

test.each([[true], [false]])(
  'that DroppableDraggableContainer gets rendered isBaseContainer %p',
  (isBaseContainer: boolean) => {
    const events = createMockedDndEvents();
    render(
      <DndProvider backend={HTML5Backend}>
        <DroppableDraggableContainer
          index={2}
          dndEvents={events}
          canDrag
          id={randomUUID()}
          isBaseContainer={isBaseContainer}
        />
      </DndProvider>
    );
    expect(screen.getByTestId('droppable-draggable-container')).toBeDefined();
  }
);

test("that DroppableDraggableContainer's droptarget spec is working", () => {
  const events = createMockedDndEvents();
  const monitor = createMockMonitor(true, ItemType.Item) as DropTargetMonitor;
  const targetItem = {
    id: randomUUID(),
    containerId: randomUUID(),
    type: ItemType.Container,
  };
  const dropTargetSpec = createDropTargetSpec(targetItem, events, createRef());
  expect(dropTargetSpec.accept).toStrictEqual(Object.values(ItemType));

  dropTargetSpec.hover(
    {
      id: randomUUID(),
      index: 0,
      type: ItemType.Item,
      containerId: randomUUID(),
    },
    monitor
  );
  expect(events.moveItem).not.toBeCalled();

  // Should not be able to hover yourself
  dropTargetSpec.hover(targetItem, monitor);
  expect(events.moveItem).not.toBeCalled();

  expect(dropTargetSpec.collect(monitor)).toStrictEqual({
    isOver: true,
  });
});
