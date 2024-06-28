import React, { act } from 'react';
import type { StudioResizableLayoutContainerProps } from './StudioResizableLayoutContainer';
import { StudioResizableLayoutContainer } from './StudioResizableLayoutContainer';
import { fireEvent, render, screen } from '@testing-library/react';
import { StudioResizableLayoutElement } from '../StudioResizableLayoutElement/StudioResizableLayoutElement';
import userEvent from '@testing-library/user-event';

describe('StudioResizableLayoutContainer', () => {
  it('should render just one handle with two elements', () => {
    renderStudioResizableLayoutContainer();
    expect(screen.getAllByRole('separator').length).toBe(1);
  });

  it('should resize containers', () => {
    renderStudioResizableLayoutContainer();
    const handle = screen.getByRole('separator');

    dragHandle(handle, { clientX: 400 }, { clientX: 200 });

    expect(screen.getAllByTestId('resizablelayoutelement')[0].style.flexGrow).toBe('0.5');
    expect(screen.getAllByTestId('resizablelayoutelement')[1].style.flexGrow).toBe('1.5');
  });

  it('should not resize containers below minimum size', () => {
    // minimum flexgrow should be minimumSize/containerSize=0.25
    renderStudioResizableLayoutContainer();
    const handle = screen.getByRole('separator');

    dragHandle(handle, { clientX: 400 }, { clientX: 0 });
    expect(screen.getAllByTestId('resizablelayoutelement')[0].style.flexGrow).toBe('0.25');
    expect(screen.getAllByTestId('resizablelayoutelement')[1].style.flexGrow).toBe('1.75');

    dragHandle(handle, { clientX: 0 }, { clientX: 800 });
    expect(screen.getAllByTestId('resizablelayoutelement')[0].style.flexGrow).toBe('1.75');
    expect(screen.getAllByTestId('resizablelayoutelement')[1].style.flexGrow).toBe('0.25');
  });
});

const dragHandle = (
  handle: HTMLElement,
  from: { clientX?: number; clientY?: number },
  to: { clientX?: number; clientY?: number },
) => {
  fireEvent.mouseDown(handle, from);
  fireEvent.mouseMove(handle, to);
  fireEvent.mouseUp(handle, to);
};

const renderStudioResizableLayoutContainer = (
  props: Partial<StudioResizableLayoutContainerProps> = {},
) => {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    value: 400,
  });
  return render(
    <StudioResizableLayoutContainer
      style={{ width: 800, height: 800 }}
      orientation='horizontal'
      {...props}
    >
      <StudioResizableLayoutElement minimumSize={100}>
        <div>test1</div>
      </StudioResizableLayoutElement>
      <StudioResizableLayoutElement minimumSize={100}>
        <div>test1</div>
      </StudioResizableLayoutElement>
    </StudioResizableLayoutContainer>,
  );
};
