import React from 'react';

import { describe, expect, it } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';
import { FormClient } from 'nextsrc/libs/form-client/form-client';
import {
  useBoundValue,
  useFormData,
  useFormValue,
  useGroupArray,
  usePushArrayItem,
  useRemoveArrayItem,
} from 'nextsrc/libs/form-client/react/hooks';
import { FormClientProvider } from 'nextsrc/libs/form-client/react/provider';

function createWrapper(client: FormClient) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <FormClientProvider client={client}>{children}</FormClientProvider>;
  }
  return Wrapper;
}

describe('useFormValue', () => {
  it('reads and writes a value', () => {
    const client = new FormClient({ defaultDataType: 'default' });
    client.setFormData({ name: 'Ola' });

    const { result } = renderHook(() => useFormValue('name'), { wrapper: createWrapper(client) });
    expect(result.current.value).toBe('Ola');

    act(() => result.current.setValue('Kari'));
    expect(result.current.value).toBe('Kari');
  });
});

describe('useBoundValue', () => {
  it('reads value with string binding', () => {
    const client = new FormClient({ defaultDataType: 'default' });
    client.setFormData({ name: 'Ola' });

    const { result } = renderHook(() => useBoundValue('name'), { wrapper: createWrapper(client) });
    expect(result.current.value).toBe('Ola');
  });

  it('reads value with DataModelBinding object', () => {
    const client = new FormClient({ defaultDataType: 'model-a' });
    client.setFormData({ name: 'A' }, 'model-a');
    client.setFormData({ name: 'B' }, 'model-b');

    const { result } = renderHook(() => useBoundValue({ dataType: 'model-b', field: 'name' }), {
      wrapper: createWrapper(client),
    });
    expect(result.current.value).toBe('B');
  });

  it('writes value via setValue', () => {
    const client = new FormClient({ defaultDataType: 'default' });
    client.setFormData({ name: 'Ola' });

    const { result } = renderHook(() => useBoundValue('name'), { wrapper: createWrapper(client) });
    act(() => result.current.setValue('Kari'));
    expect(result.current.value).toBe('Kari');
  });

  it('reads inside repeating group with parentBinding and itemIndex', () => {
    const client = new FormClient({ defaultDataType: 'default' });
    client.setFormData({ people: [{ name: 'A' }, { name: 'B' }] });

    const repeatingGroupItemIndex: number = 1;
    const { result } = renderHook(() => useBoundValue('people.name', 'people', repeatingGroupItemIndex), {
      wrapper: createWrapper(client),
    });
    expect(result.current.value).toBe('B');
  });

  it('writes inside repeating group', () => {
    const client = new FormClient({ defaultDataType: 'default' });
    client.setFormData({ people: [{ name: 'A' }, { name: 'B' }] });
    const repeatingGroupItemIndex: number = 0;
    const { result } = renderHook(() => useBoundValue('people.name', 'people', repeatingGroupItemIndex), {
      wrapper: createWrapper(client),
    });
    act(() => result.current.setValue('C'));
    expect(result.current.value).toBe('C');
    expect(
      client.formDataStore.getState().getBoundValue('people.name', { parentBinding: 'people', itemIndex: 1 }),
    ).toBe('B');
  });
});

describe('useFormData', () => {
  it('returns full data tree', () => {
    const client = new FormClient({ defaultDataType: 'default' });
    client.setFormData({ name: 'Ola', age: 30 });

    const { result } = renderHook(() => useFormData(), { wrapper: createWrapper(client) });
    expect(result.current).toEqual({ name: 'Ola', age: 30 });
  });
});

describe('useGroupArray', () => {
  it('returns array at binding path', () => {
    const client = new FormClient({ defaultDataType: 'default' });
    client.setFormData({ items: [{ x: 1 }, { x: 2 }] });

    const { result } = renderHook(() => useGroupArray('items'), { wrapper: createWrapper(client) });
    expect(result.current).toEqual([{ x: 1 }, { x: 2 }]);
  });

  it('returns empty array for missing path', () => {
    const client = new FormClient({ defaultDataType: 'default' });
    client.setFormData({ other: 'val' });

    const { result } = renderHook(() => useGroupArray('items'), { wrapper: createWrapper(client) });
    expect(result.current).toEqual([]);
  });

  it('reads from secondary dataType', () => {
    const client = new FormClient({ defaultDataType: 'model-a' });
    client.setFormData({ items: [{ a: 1 }] }, 'model-a');
    client.setFormData({ items: [{ b: 2 }, { b: 3 }] }, 'model-b');

    const { result } = renderHook(() => useGroupArray({ dataType: 'model-b', field: 'items' }), {
      wrapper: createWrapper(client),
    });
    expect(result.current).toEqual([{ b: 2 }, { b: 3 }]);
  });
});

describe('usePushArrayItem', () => {
  it('appends item to array', () => {
    const client = new FormClient({ defaultDataType: 'default' });
    client.setFormData({ items: [{ x: 1 }] });

    const { result: pushResult } = renderHook(() => usePushArrayItem('items'), { wrapper: createWrapper(client) });
    const { result: arrayResult } = renderHook(() => useGroupArray('items'), { wrapper: createWrapper(client) });

    act(() => pushResult.current({ x: 2 }));
    expect(arrayResult.current).toEqual([{ x: 1 }, { x: 2 }]);
  });
});

describe('useRemoveArrayItem', () => {
  it('removes item by index', () => {
    const client = new FormClient({ defaultDataType: 'default' });
    client.setFormData({ items: [{ x: 1 }, { x: 2 }, { x: 3 }] });

    const { result: removeResult } = renderHook(() => useRemoveArrayItem('items'), {
      wrapper: createWrapper(client),
    });
    const { result: arrayResult } = renderHook(() => useGroupArray('items'), { wrapper: createWrapper(client) });

    act(() => removeResult.current(1));
    expect(arrayResult.current).toEqual([{ x: 1 }, { x: 3 }]);
  });
});
