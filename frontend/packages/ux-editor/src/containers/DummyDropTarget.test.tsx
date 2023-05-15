import React from 'react';
import { render, screen } from '@testing-library/react';
import { dropTargetSpec as dummyDropTargetSpec, DummyDropTarget } from './DummyDropTarget';
import { randomUUID } from 'crypto';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { DropTargetMonitor } from 'react-dnd';
import { DndProvider } from 'react-dnd';
import { createMockedDndEvents, createMockMonitor } from '../testing/dndMocks';
import { ItemType } from '../types/dndTypes';

describe('DummyDropTarget', () => {
  it('Renders', () => {
    const events = createMockedDndEvents();
    render(
      <DndProvider backend={HTML5Backend}>
        <DummyDropTarget index={2} containerId={randomUUID()} events={events}/>
      </DndProvider>
    );
    expect(screen.getByTestId('dummy-drop-target')).toBeDefined();
  });

  it("Has a working droptarget spec", () => {
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
      monitor
    );
    expect(events.moveItem).toBeCalled();
    expect(dropTargetSpec.collect(monitor)).toStrictEqual({
      isOver: true,
    });
  });
});
