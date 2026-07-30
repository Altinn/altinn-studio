import { act, renderHook } from '@testing-library/react';

import { useAlertOnChange } from './useAlertOnChange';

describe('useAlertOnChange', () => {
  it('calls onChange immediately when disabled', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useAlertOnChange(false, onChange));

    act(() => result.current.handleChange('a'));

    expect(onChange).toHaveBeenCalledWith('a');
    expect(result.current.alertOpen).toBe(false);
  });

  it('suspends the change and opens the alert with the generated message when enabled', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useAlertOnChange(true, onChange, undefined, (value) => `endre til ${value}?`),
    );

    act(() => result.current.handleChange('a'));

    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.alertOpen).toBe(true);
    expect(result.current.alertMessage).toBe('endre til a?');
  });

  it('applies the suspended change on confirm', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useAlertOnChange(true, onChange));

    act(() => result.current.handleChange('a'));
    act(() => result.current.confirmChange());

    expect(onChange).toHaveBeenCalledWith('a');
    expect(result.current.alertOpen).toBe(false);
  });

  it('discards the suspended change on cancel', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useAlertOnChange(true, onChange));

    act(() => result.current.handleChange('a'));
    act(() => result.current.cancelChange());

    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.alertOpen).toBe(false);
  });

  it('calls onChange immediately when shouldAlert returns false', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useAlertOnChange(true, onChange, () => false));

    act(() => result.current.handleChange('a'));

    expect(onChange).toHaveBeenCalledWith('a');
    expect(result.current.alertOpen).toBe(false);
  });
});
