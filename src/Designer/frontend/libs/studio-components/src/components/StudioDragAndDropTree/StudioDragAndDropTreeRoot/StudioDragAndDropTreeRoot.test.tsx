import type { ReactNode } from 'react';
import React, { useContext } from 'react';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioDragAndDropTreeRoot } from './StudioDragAndDropTreeRoot';
import { StudioDragAndDrop } from '../../StudioDragAndDrop';
import { StudioDragAndDropTreeRootContext } from './StudioDragAndDropTreeRootContext';

// Test data:
const childrenTestId = 'test';
const renderComponent = (children?: ReactNode): React.ReactElement => (
  <StudioDragAndDrop.Provider onAdd={jest.fn()} onMove={jest.fn()} rootId='rootId'>
    <StudioDragAndDropTreeRoot>
      <div data-testid={childrenTestId}>{children}</div>
    </StudioDragAndDropTreeRoot>
  </StudioDragAndDrop.Provider>
);

const renderStudioDragAndDropTreeRoot = (children?: ReactNode): ReturnType<typeof render> =>
  render(renderComponent(children));

describe('StudioDragAndDropTreeRoot', () => {
  afterEach(jest.clearAllMocks);

  it('Renders children', () => {
    renderStudioDragAndDropTreeRoot();
    expect(screen.getByTestId(childrenTestId)).toBeInTheDocument();
  });

  it('Sets hovered node parent to given value when `setHoveredNodeParent` is called and back to null when mouse leaves', async () => {
    const user = userEvent.setup();

    const { result } = renderHook(() => useContext(StudioDragAndDropTreeRootContext), {
      wrapper: ({ children }) => renderComponent(children),
    });
    const item = screen.getByTestId(childrenTestId);

    expect(result.current?.hoveredNodeParent).toBeUndefined(); // Should be undefined by default

    const hoveredNodeParent = 'hoveredNodeParent';
    await user.hover(item);
    await waitFor(() => result.current?.setHoveredNodeParent?.(hoveredNodeParent)); // Simulate setHoveredNodeParent call from somewhere inside the children
    expect(result.current?.hoveredNodeParent).toBe(hoveredNodeParent);

    await user.unhover(item); // Simulate mouse leave
    expect(result.current?.hoveredNodeParent).toBeUndefined();
  });
});
