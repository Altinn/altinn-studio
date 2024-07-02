import { act, renderHook } from '@testing-library/react';
import { horizontal } from '../StudioResizableLayoutContainer/StudioResizableLayoutContainer';
import { useStudioResizableLayoutMouseMovement } from './useStudioResizableLayoutMouseMovement';

describe('useStudioResizableLayoutMouseMovement', () => {
  it('should return onMouseDown and isResizing', () => {
    const { result } = renderHook(() =>
      useStudioResizableLayoutMouseMovement(horizontal, jest.fn()),
    );
    expect(result.current).toHaveProperty('onMouseDown');
    expect(result.current).toHaveProperty('isResizing');
  });

  it('should call onMousePosChange when onMouseDown is called', () => {
    const onMousePosChange = jest.fn();
    const { result } = renderHook(() =>
      useStudioResizableLayoutMouseMovement(horizontal, onMousePosChange),
    );

    const event = new MouseEvent('mousedown');
    act(() => {
      result.current.onMouseDown(event);
    });
    const mouseMoveEvent = new MouseEvent('mousemove');
    window.dispatchEvent(mouseMoveEvent);
    expect(onMousePosChange).toHaveBeenCalled();
  });
});
