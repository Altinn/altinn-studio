import { act, renderHook } from '@testing-library/react';
import {
  horizontal,
  vertical,
} from '../StudioResizableLayoutContainer/StudioResizableLayoutContainer';
import { useStudioResizableLayoutMouseMovement } from './useStudioResizableLayoutMouseMovement';
import type React from 'react';

describe('useStudioResizableLayoutMouseMovement', () => {
  it('should return onMouseDown and isResizing', () => {
    const { result } = renderHook(() =>
      useStudioResizableLayoutMouseMovement(horizontal, jest.fn()),
    );
    expect(result.current).toHaveProperty('onMouseDown');
    expect(result.current).toHaveProperty('isResizing');
  });

  it.each([horizontal, vertical])(
    'should call onMousePosChange when mouse is moved in a %p layout',
    (orientation) => {
      const onMousePosChange = jest.fn();
      const { result } = renderHook(() =>
        useStudioResizableLayoutMouseMovement(orientation, onMousePosChange),
      );

      act(() => {
        result.current.onMouseDown(mockMouseEvent);
      });
      const mouseMoveEvent = new MouseEvent('mousemove');
      window.dispatchEvent(mouseMoveEvent);
      expect(onMousePosChange).toHaveBeenCalled();
    },
  );

  it('should not start resizing if mouse button is not 0/LMB', () => {
    const onMousePosChange = jest.fn();
    const { result } = renderHook(() =>
      useStudioResizableLayoutMouseMovement(horizontal, onMousePosChange),
    );

    act(() => {
      result.current.onMouseDown({ ...mockMouseEvent, button: 1 });
    });
    const mouseMoveEvent = new MouseEvent('mousemove');
    window.dispatchEvent(mouseMoveEvent);
    expect(onMousePosChange).not.toHaveBeenCalled();
  });
});

const mockMouseEvent: React.MouseEvent<HTMLDivElement> = {
  nativeEvent: new MouseEvent('mousedown'),
  type: 'mousedown',
  button: 0,
  buttons: 1,
  altKey: false,
  clientX: 0,
  clientY: 0,
  ctrlKey: false,
  metaKey: false,
  movementX: 0,
  movementY: 0,
  pageX: 0,
  pageY: 0,
  screenX: 0,
  screenY: 0,
  shiftKey: false,
  relatedTarget: null,
  currentTarget: null,
  target: null,
  detail: 0,
  view: null,
  bubbles: false,
  cancelable: false,
  defaultPrevented: false,
  eventPhase: 0,
  isTrusted: false,
  timeStamp: 0,
  stopPropagation: jest.fn(),
  preventDefault: jest.fn(),
  isDefaultPrevented: jest.fn(),
  isPropagationStopped: jest.fn(),
  persist: jest.fn(),
  getModifierState: jest.fn(),
  // Add other properties as needed
} as unknown as React.MouseEvent<HTMLDivElement>;
