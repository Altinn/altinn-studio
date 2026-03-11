import { describe, expect, it, jest } from '@jest/globals';
import { createFormDataStore, selectCurrentData } from 'nextsrc/libs/form-client/stores/formDataStore';

describe('formDataStore', () => {
  describe('single model read/write', () => {
    it('reads a primitive value', () => {
      const store = createFormDataStore('default', { name: 'Ola' });
      expect(store.getState().getValue('name')).toBe('Ola');
    });

    it('reads nested value via dot path', () => {
      const store = createFormDataStore('default', { person: { name: 'Ola' } });
      expect(store.getState().getValue('person.name')).toBe('Ola');
    });

    it('returns null for missing path', () => {
      const store = createFormDataStore('default', { name: 'Ola' });
      expect(store.getState().getValue('missing')).toBeNull();
    });

    it('writes a value and reads it back', () => {
      const store = createFormDataStore('default', { name: 'Ola' });
      store.getState().setValue('name', 'Kari');
      expect(store.getState().getValue('name')).toBe('Kari');
    });

    it('skips write when value is unchanged', () => {
      const store = createFormDataStore('default', { name: 'Ola' });
      const stateBefore = store.getState();
      store.getState().setValue('name', 'Ola');
      expect(store.getState()).toBe(stateBefore);
    });
  });

  describe('multi-model', () => {
    it('reads/writes to default dataType', () => {
      const store = createFormDataStore('model-a', { name: 'A' });
      expect(store.getState().getValue('name', 'model-a')).toBe('A');
    });

    it('reads/writes to secondary dataType', () => {
      const store = createFormDataStore('model-a', { name: 'A' });
      store.getState().setData({ name: 'B' }, 'model-b');
      expect(store.getState().getValue('name', 'model-b')).toBe('B');
      expect(store.getState().getValue('name', 'model-a')).toBe('A');
    });

    it('setValue targets specific dataType', () => {
      const store = createFormDataStore('model-a', { x: 1 });
      store.getState().setData({ x: 10 }, 'model-b');
      store.getState().setValue('x', 99, 'model-b');
      expect(store.getState().getValue('x', 'model-b')).toBe(99);
      expect(store.getState().getValue('x', 'model-a')).toBe(1);
    });

    it('setData skips update when data is deeply equal', () => {
      const store = createFormDataStore('default', { list: [1, 2, 3] });
      const stateBefore = store.getState();
      store.getState().setData({ list: [1, 2, 3] });
      expect(store.getState()).toBe(stateBefore);
    });
  });

  describe('bound values with BindingContext', () => {
    it('reads bound value without context (top-level)', () => {
      const store = createFormDataStore('default', { name: 'Ola' });
      expect(store.getState().getBoundValue('name')).toBe('Ola');
    });

    it('reads bound value inside repeating group', () => {
      const store = createFormDataStore('default', { people: [{ name: 'A' }, { name: 'B' }] });
      expect(store.getState().getBoundValue('people.name', { parentBinding: 'people', itemIndex: 1 })).toBe('B');
    });

    it('writes bound value inside repeating group', () => {
      const store = createFormDataStore('default', { people: [{ name: 'A' }, { name: 'B' }] });
      store.getState().setBoundValue('people.name', 'C', { parentBinding: 'people', itemIndex: 0 });
      expect(store.getState().getBoundValue('people.name', { parentBinding: 'people', itemIndex: 0 })).toBe('C');
      expect(store.getState().getBoundValue('people.name', { parentBinding: 'people', itemIndex: 1 })).toBe('B');
    });

    it('resolves multi-level path inside repeating group', () => {
      const store = createFormDataStore('default', {
        people: [{ addresses: [{ street: 'Storgt' }] }],
      });
      expect(store.getState().getBoundValue('people.addresses', { parentBinding: 'people', itemIndex: 0 })).toEqual([
        { street: 'Storgt' },
      ]);
    });

    it('leaves unrelated binding unchanged inside repeating group', () => {
      const store = createFormDataStore('default', { other: 'val', people: [{ name: 'A' }] });
      expect(store.getState().getBoundValue('other', { parentBinding: 'people', itemIndex: 0 })).toBe('val');
    });

    it('uses dataType from BindingContext', () => {
      const store = createFormDataStore('model-a', { name: 'A' });
      store.getState().setData({ name: 'B' }, 'model-b');
      expect(store.getState().getBoundValue('name', { dataType: 'model-b' })).toBe('B');
    });
  });

  describe('array operations', () => {
    it('getArray returns array at path', () => {
      const store = createFormDataStore('default', { items: [{ x: 1 }, { x: 2 }] });
      expect(store.getState().getArray('items')).toEqual([{ x: 1 }, { x: 2 }]);
    });

    it('getArray returns empty array for missing path', () => {
      const store = createFormDataStore('default', { name: 'Ola' });
      expect(store.getState().getArray('missing')).toEqual([]);
    });

    it('pushArrayItem appends to array', () => {
      const store = createFormDataStore('default', { items: [{ x: 1 }] });
      store.getState().pushArrayItem('items', { x: 2 });
      expect(store.getState().getArray('items')).toEqual([{ x: 1 }, { x: 2 }]);
    });

    it('pushArrayItem creates array if missing', () => {
      const store = createFormDataStore('default', { other: 'value' });
      store.getState().pushArrayItem('items', { x: 1 });
      expect(store.getState().getArray('items')).toEqual([{ x: 1 }]);
    });

    it('removeArrayItem removes by index', () => {
      const store = createFormDataStore('default', { items: [{ x: 1 }, { x: 2 }, { x: 3 }] });
      store.getState().removeArrayItem('items', 1);
      expect(store.getState().getArray('items')).toEqual([{ x: 1 }, { x: 3 }]);
    });

    it('removeArrayItem ignores out-of-bounds index', () => {
      const store = createFormDataStore('default', { items: [{ x: 1 }] });
      store.getState().removeArrayItem('items', 5);
      expect(store.getState().getArray('items')).toEqual([{ x: 1 }]);
    });

    it('array operations work inside repeating group', () => {
      const store = createFormDataStore('default', {
        groups: [{ items: [{ v: 'a' }] }, { items: [{ v: 'b' }] }],
      });
      store.getState().pushArrayItem('groups.items', { v: 'c' }, { parentBinding: 'groups', itemIndex: 1 });
      expect(store.getState().getArray('groups.items', { parentBinding: 'groups', itemIndex: 1 })).toEqual([
        { v: 'b' },
        { v: 'c' },
      ]);
      expect(store.getState().getArray('groups.items', { parentBinding: 'groups', itemIndex: 0 })).toEqual([
        { v: 'a' },
      ]);
    });
  });

  describe('onChange callback', () => {
    it('fires on setValue', () => {
      const onChange = jest.fn();
      const store = createFormDataStore('default', { name: 'Ola' }, { onChange });
      store.getState().setValue('name', 'Kari');
      expect(onChange).toHaveBeenCalledWith('name', 'Kari', 'Ola', 'default');
    });

    it('fires on setBoundValue', () => {
      const onChange = jest.fn();
      const store = createFormDataStore('default', { name: 'Ola' }, { onChange });
      store.getState().setBoundValue('name', 'Kari');
      expect(onChange).toHaveBeenCalledWith('name', 'Kari', 'Ola', 'default');
    });

    it('does not fire when value is unchanged', () => {
      const onChange = jest.fn();
      const store = createFormDataStore('default', { name: 'Ola' }, { onChange });
      store.getState().setValue('name', 'Ola');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('fires on pushArrayItem with new and previous array', () => {
      const onChange = jest.fn();
      const store = createFormDataStore('default', { items: [{ x: 1 }] }, { onChange });
      store.getState().pushArrayItem('items', { x: 2 });
      expect(onChange).toHaveBeenCalledWith('items', [{ x: 1 }, { x: 2 }], [{ x: 1 }], 'default');
    });

    it('fires on removeArrayItem', () => {
      const onChange = jest.fn();
      const store = createFormDataStore('default', { items: [{ x: 1 }, { x: 2 }] }, { onChange });
      store.getState().removeArrayItem('items', 0);
      expect(onChange).toHaveBeenCalledWith('items', [{ x: 2 }], [{ x: 1 }, { x: 2 }], 'default');
    });
  });

  describe('coerceValue', () => {
    it('applies coercion before writing', () => {
      const coerceValue = jest.fn().mockReturnValue({ value: 42, error: false });
      const store = createFormDataStore('default', { age: 0 }, { coerceValue });
      store.getState().setValue('age', '42' as unknown as number);
      expect(coerceValue).toHaveBeenCalledWith('age', '42', 'default');
      expect(store.getState().getValue('age')).toBe(42);
    });

    it('blocks write when coercion returns error', () => {
      const coerceValue = jest.fn().mockReturnValue({ value: null, error: true });
      const store = createFormDataStore('default', { age: 10 }, { coerceValue });
      store.getState().setValue('age', 'invalid' as unknown as number);
      expect(store.getState().getValue('age')).toBe(10);
    });

    it('applies coercion on setBoundValue', () => {
      const coerceValue = jest.fn().mockReturnValue({ value: 99, error: false });
      const store = createFormDataStore('default', { age: 0 }, { coerceValue });
      store.getState().setBoundValue('age', '99' as unknown as number);
      expect(store.getState().getValue('age')).toBe(99);
    });
  });

  describe('selectCurrentData', () => {
    it('selects current data for default dataType', () => {
      const store = createFormDataStore('default', { name: 'Ola' });
      expect(selectCurrentData(store.getState())).toEqual({ name: 'Ola' });
    });

    it('returns null when no data is set', () => {
      const store = createFormDataStore('default');
      expect(selectCurrentData(store.getState())).toBeNull();
    });
  });
});
