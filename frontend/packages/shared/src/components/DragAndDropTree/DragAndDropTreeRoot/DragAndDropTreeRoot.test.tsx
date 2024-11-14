import type { ReactNode } from 'react';
import React, { useContext } from 'react';
import { render as renderRtl, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DragAndDropTreeRoot } from './DragAndDropTreeRoot';
import { StudioDragAndDrop } from '@studio/components';
import { DragAndDropTreeRootContext } from 'app-shared/components/DragAndDropTree/DragAndDropTreeRoot/DragAndDropTreeRootContext';

const user = userEvent.setup();

// Test data:
const childrenTestId = 'test';
const renderComponent = (children?: ReactNode) => (
  <StudioDragAndDrop.Provider onAdd={jest.fn()} onMove={jest.fn()} rootId='rootId'>
    <DragAndDropTreeRoot>
      <div data-testid={childrenTestId}>{children}</div>
    </DragAndDropTreeRoot>
  </StudioDragAndDrop.Provider>
);

const render = (children?: ReactNode) => renderRtl(renderComponent(children));

describe('DragAndDropTreeRoot', () => {
  afterEach(jest.clearAllMocks);

  it('Renders children', () => {
    render();
    expect(screen.getByTestId(childrenTestId)).toBeInTheDocument();
  });

  it('Sets hovered node parent to given value when `setHoveredNodeParent` is called and back to null when mouse leaves', async () => {
    const { result } = renderHook(() => useContext(DragAndDropTreeRootContext), {
      wrapper: ({ children }) => renderComponent(children),
    });
    const item = screen.getByTestId(childrenTestId);

    expect(result.current.hoveredNodeParent).toBeNull(); // Should be null by default

    const hoveredNodeParent = 'hoveredNodeParent';
    await user.hover(item);
    await waitFor(() => result.current.setHoveredNodeParent(hoveredNodeParent)); // Simulate setHoveredNodeParent call from somewhere inside the children
    expect(result.current.hoveredNodeParent).toBe(hoveredNodeParent);

    await user.unhover(item); // Simulate mouse leave
    expect(result.current.hoveredNodeParent).toBeNull();
  });
});
