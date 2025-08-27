import { renderHook, waitFor } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';
import { typedLocalStorage } from 'libs/studio-pure-functions/src';

describe('useLocalStorage', () => {
  it('Gives access to the stored value', () => {
    const key = 'someKey';
    const value = 'value';
    typedLocalStorage.setItem(key, value);
    const { result } = renderHook(() => useLocalStorage(key));
    expect(result.current[0]).toBe(value);
  });

  it('Gets and parses value on first render only', () => {
    const key = 'someKey';
    const getItemSpy = jest.spyOn(window.Storage.prototype, 'getItem').mockImplementation();
    const { rerender } = renderHook(() => useLocalStorage(key));
    rerender();
    expect(getItemSpy).toHaveBeenCalledTimes(1);
    getItemSpy.mockRestore();
  });

  it('Provides a function that sets the stored value', async () => {
    const key = 'keyThatIsNotYetSet';
    const { result } = renderHook(() => useLocalStorage(key));
    const value = 'value';
    await waitFor(() => result.current[1](value));
    expect(typedLocalStorage.getItem(key)).toBe(value);
    expect(result.current[0]).toBe(value);
  });

  it('Provides a function that removes the stored value', async () => {
    const key = 'keyThatShouldBeRemoved';
    const value = 'value';
    typedLocalStorage.setItem(key, value);
    const { result } = renderHook(() => useLocalStorage(key));
    await waitFor(() => result.current[2]());
    expect(typedLocalStorage.getItem(key)).toBeNull();
    expect(result.current[0]).toBeUndefined();
  });
});
