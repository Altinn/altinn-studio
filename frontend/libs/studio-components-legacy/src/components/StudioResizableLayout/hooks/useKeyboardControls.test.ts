import { renderHook } from '@testing-library/react';
import { useKeyboardControls } from './useKeyboardControls';

describe('useKeyboardControls', () => {
  let onResize: jest.Mock;
  let result: any;

  beforeEach(() => {
    onResize = jest.fn();
    const { result: hookResult } = renderHook(() => useKeyboardControls(onResize));
    result = hookResult;
  });

  it('should call onResize with -10 when ArrowLeft is pressed', () => {
    result.current.onKeyDown({ key: 'ArrowLeft' });
    expect(onResize).toHaveBeenCalledWith(-10);
  });

  it('should call onResize with -50 when ArrowLeft and Shift are pressed', () => {
    result.current.onKeyDown({ key: 'ArrowUp', shiftKey: true });
    expect(onResize).toHaveBeenCalledWith(-50);
  });

  it('should call onResize with 10 when ArrowRight is pressed', () => {
    result.current.onKeyDown({ key: 'ArrowRight' });
    expect(onResize).toHaveBeenCalledWith(10);
  });

  it('should call onResize with 50 when ArrowRight and Shift are pressed', () => {
    result.current.onKeyDown({ key: 'ArrowDown', shiftKey: true });
    expect(onResize).toHaveBeenCalledWith(50);
  });

  it('should not call onResize when a key different from ArrowLeft, ArrowRight, ArrowUp or ArrowDown is pressed', () => {
    result.current.onKeyDown({ key: 'k' });
    expect(onResize).not.toHaveBeenCalled();
  });
});
