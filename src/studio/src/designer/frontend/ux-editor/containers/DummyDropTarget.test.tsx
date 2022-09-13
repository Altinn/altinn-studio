import React from 'react';
import { render, screen } from '@testing-library/react';
import { DummyDropTarget } from './DummyDropTarget';
import { randomUUID } from 'crypto';
import { EditorDndEvents } from './helpers/dnd-types';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';

test('that DummyDropTarget gets rendered', () => {
  const events: EditorDndEvents = {
    moveItem: jest.fn(),
    moveItemToBottom: jest.fn(),
    moveItemToTop: jest.fn(),
    onDropItem: jest.fn(),
  };
  render(
    <DndProvider backend={HTML5Backend}>
      <DummyDropTarget index={2} containerId={randomUUID()} events={events} />
    </DndProvider>,
  );
  expect(screen.getByTestId('dummy-drop-target')).toBeDefined();
});
