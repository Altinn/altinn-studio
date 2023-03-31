import { act, renderHook } from '@testing-library/react';

import { useDelayedSavedState } from 'src/hooks/useDelayedSavedState';

describe('useDelayedSaveState', () => {
  jest.useFakeTimers();

  function render(initial: string) {
    const handleDataChangeMock = jest.fn();
    const { result, rerender } = renderHook((props: { formData?: string }) =>
      useDelayedSavedState(handleDataChangeMock, props?.formData || initial),
    );

    return { result, rerender, handleDataChangeMock };
  }

  it('should debounce input by default', () => {
    const { result, handleDataChangeMock } = render('initial value');

    expect(result.current.value).toBe('initial value');
    act(() => result.current.setValue('great text'));

    expect(result.current.value).toBe('great text');
    expect(handleDataChangeMock).toHaveBeenCalledTimes(0);
    jest.runOnlyPendingTimers();

    expect(result.current.value).toBe('great text');
    expect(handleDataChangeMock).toHaveBeenCalledTimes(1);
    expect(handleDataChangeMock).toHaveBeenCalledWith('great text', { validate: true });

    act(() => result.current.setValue('great text 2'));
    expect(result.current.value).toBe('great text 2');
    expect(handleDataChangeMock).toHaveBeenCalledTimes(1);
    jest.runOnlyPendingTimers();

    expect(result.current.value).toBe('great text 2');
    expect(handleDataChangeMock).toHaveBeenCalledTimes(2);
    expect(handleDataChangeMock).toHaveBeenCalledWith('great text 2', { validate: true });
  });

  it('should alter the current value if re-rendered with a new value', () => {
    const { result, rerender, handleDataChangeMock } = render('1');

    expect(result.current.value).toBe('1');
    act(() => result.current.setValue('2'));
    rerender({ formData: '3' });

    expect(result.current.value).toBe('3');
    expect(handleDataChangeMock).toHaveBeenCalledTimes(0);
    jest.runOnlyPendingTimers();

    expect(result.current.value).toBe('3');
    expect(handleDataChangeMock).toHaveBeenCalledTimes(0);
  });

  it('should not alter the current value if re-rendered with the previous value', () => {
    const { result, rerender, handleDataChangeMock } = render('1');

    expect(result.current.value).toBe('1');
    act(() => result.current.setValue('2'));
    rerender({ formData: '1' });

    expect(result.current.value).toBe('2');
    expect(handleDataChangeMock).toHaveBeenCalledTimes(0);
    jest.runOnlyPendingTimers();

    expect(result.current.value).toBe('2');
    expect(handleDataChangeMock).toHaveBeenCalledTimes(1);
    expect(handleDataChangeMock).toHaveBeenCalledWith('2', { validate: true });
    rerender({ formData: '2' });

    // But if handleDataChangeMock has been called, and we saved 2 and got re-rendered with it, it's now OK to
    // overwrite the data again from the outside with 1
    rerender({ formData: '1' });
    expect(result.current.value).toBe('1');
    jest.runOnlyPendingTimers();
    expect(result.current.value).toBe('1');
    expect(handleDataChangeMock).toHaveBeenCalledTimes(1);
  });
});
