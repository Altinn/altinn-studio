import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  dropTargetSpec as dummyDropTargetSpec,
  DummyDropTarget,
} from './DummyDropTarget';
import { randomUUID } from 'crypto';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider, DropTargetMonitor } from 'react-dnd';
import {
  createMockedDndEvents,
  createMockMonitor,
} from './helpers/dnd-helpers.test';
import { ItemType } from './helpers/dnd-types';

test('that DummyDropTarget gets rendered', () => {
  const events = createMockedDndEvents();
  render(
    <DndProvider backend={HTML5Backend}>
      <DummyDropTarget index={2} containerId={randomUUID()} events={events} />
    </DndProvider>,
  );
  expect(screen.getByTestId('dummy-drop-target')).toBeDefined();
});

test("that DummyDropTarget's droptarget spec is working", () => {
  const events = createMockedDndEvents();
  const monitor = createMockMonitor(true, ItemType.Item) as DropTargetMonitor;
  const dropTargetSpec = dummyDropTargetSpec(randomUUID(), 2, events);
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
  expect(events.moveItem).toBeCalled();
  expect(dropTargetSpec.collect(monitor)).toStrictEqual({
    isOver: true,
  });
});
