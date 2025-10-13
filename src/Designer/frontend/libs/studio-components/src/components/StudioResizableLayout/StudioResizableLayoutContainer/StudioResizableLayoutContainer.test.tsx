import React from 'react';
import type { StudioResizableLayoutContainerProps } from './StudioResizableLayoutContainer';
import { StudioResizableLayoutContainer } from './StudioResizableLayoutContainer';
import { fireEvent, render, screen } from '@testing-library/react';
import { StudioResizableLayoutElement } from '../StudioResizableLayoutElement/StudioResizableLayoutElement';

describe('StudioResizableLayoutContainer', () => {
  it('should render two handles with three elements', () => {
    renderStudioResizableLayoutContainer();
    expect(screen.getAllByRole('separator').length).toBe(2);
  });

  it('should resize containers', () => {
    renderStudioResizableLayoutContainer();
    const handle = screen.getAllByRole('separator')[0];

    dragHandle(handle, { clientX: 400 }, { clientX: 200 });

    expect(screen.getAllByTestId('resizablelayoutelement')[0].style.flexGrow).toBe('0.5');
    expect(screen.getAllByTestId('resizablelayoutelement')[1].style.flexGrow).toBe('1.5');
  });

  it('should not resize containers below minimum size', () => {
    // minimum flexgrow should be minimumSize/containerSize=0.25
    renderStudioResizableLayoutContainer();
    const handle = screen.getAllByRole('separator')[0];

    dragHandle(handle, { clientX: 400 }, { clientX: 0 });
    expect(screen.getAllByTestId('resizablelayoutelement')[0].style.flexGrow).toBe('0.25');
    expect(screen.getAllByTestId('resizablelayoutelement')[1].style.flexGrow).toBe('1.75');

    dragHandle(handle, { clientX: 0 }, { clientX: 800 });
    expect(screen.getAllByTestId('resizablelayoutelement')[0].style.flexGrow).toBe('1.75');
    expect(screen.getAllByTestId('resizablelayoutelement')[1].style.flexGrow).toBe('0.25');
  });

  it('should not resize containers above maximum size', () => {
    renderStudioResizableLayoutContainer(600);
    const handle = screen.getAllByRole('separator')[0];

    dragHandle(handle, { clientX: 400 }, { clientX: 800 });
    expect(screen.getAllByTestId('resizablelayoutelement')[0].style.flexGrow).toBe('1.5');
    expect(screen.getAllByTestId('resizablelayoutelement')[1].style.flexGrow).toBe('0.5');
  });

  it('should render StudioResizableLayoutHandle with base CSS classes', () => {
    renderStudioResizableLayoutContainer();
    expect(screen.getAllByRole('separator')[0]).toHaveClass('resizeHandle');
    expect(screen.getAllByRole('separator')[1]).toHaveClass('resizeHandle');
  });

  it('should render StudioResizableLayoutHandle with multiple CSS classes', () => {
    renderStudioResizableLayoutContainer();
    expect(screen.getAllByRole('separator')[0]).toHaveClass('resizeHandle');
    expect(screen.getAllByRole('separator')[0]).toHaveClass('resizeHandleH');
    expect(screen.getAllByRole('separator')[0]).not.toHaveClass('hideLeftSide');

    expect(screen.getAllByRole('separator')[1]).toHaveClass('resizeHandle');
    expect(screen.getAllByRole('separator')[1]).not.toHaveClass('resizeHandleH');
    expect(screen.getAllByRole('separator')[1]).not.toHaveClass('hideLeftSide');
  });
});

const dragHandle = (
  handle: HTMLElement,
  from: { clientX?: number; clientY?: number },
  to: { clientX?: number; clientY?: number },
): void => {
  fireEvent.mouseDown(handle, from);
  fireEvent.mouseMove(handle, to);
  fireEvent.mouseUp(handle, to);
};

const renderStudioResizableLayoutContainer = (
  maximumSize = 800,
  collapsed = false,
  props: Partial<StudioResizableLayoutContainerProps> = {},
): ReturnType<typeof render> => {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    value: 400,
  });
  return render(
    <StudioResizableLayoutContainer
      style={{ width: 800, height: 800 }}
      orientation='horizontal'
      {...props}
    >
      <StudioResizableLayoutElement
        minimumSize={100}
        maximumSize={maximumSize}
        collapsed={collapsed}
        collapsedSize={400}
        hasNeighbour={true}
      >
        <div>test1</div>
      </StudioResizableLayoutElement>
      <StudioResizableLayoutElement
        minimumSize={100}
        maximumSize={maximumSize}
        collapsed={collapsed}
        collapsedSize={400}
        hasNeighbour={true}
        disableRightHandle={true}
      >
        <div>test2</div>
      </StudioResizableLayoutElement>
      <StudioResizableLayoutElement
        minimumSize={100}
        maximumSize={maximumSize}
        collapsed={collapsed}
        collapsedSize={400}
      >
        <div>test3</div>
      </StudioResizableLayoutElement>
    </StudioResizableLayoutContainer>,
  );
};
