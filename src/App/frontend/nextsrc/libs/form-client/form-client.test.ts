import { describe, expect, it, jest } from '@jest/globals';
import { FormClient } from 'nextsrc/libs/form-client/form-client';

describe('FormClient', () => {
  describe('constructor', () => {
    it('creates stores with defaultDataType', () => {
      const client = new FormClient({ defaultDataType: 'myModel' });
      expect(client.defaultDataType).toBe('myModel');
    });

    it('defaults dataType to "default"', () => {
      const client = new FormClient();
      expect(client.defaultDataType).toBe('default');
    });
  });

  describe('setFormData / getValue', () => {
    it('stores data for default dataType', () => {
      const client = new FormClient({ defaultDataType: 'model-a' });
      client.setFormData({ name: 'Ola' });
      expect(client.formDataStore.getState().getValue('name', 'model-a')).toBe('Ola');
    });

    it('stores data for explicit dataType', () => {
      const client = new FormClient({ defaultDataType: 'model-a' });
      client.setFormData({ name: 'B' }, 'model-b');
      expect(client.formDataStore.getState().getValue('name', 'model-b')).toBe('B');
      expect(client.formDataStore.getState().getValue('name', 'model-a')).toBeNull();
    });
  });

  describe('setDefaultDataType', () => {
    it('updates defaultDataType on client and store', () => {
      const client = new FormClient({ defaultDataType: 'old' });
      client.setDefaultDataType('new');
      expect(client.defaultDataType).toBe('new');
      expect(client.formDataStore.getState().defaultDataType).toBe('new');
    });
  });

  describe('onFormDataChange', () => {
    it('fires callback on setValue', () => {
      const client = new FormClient({ defaultDataType: 'default' });
      client.setFormData({ x: 1 });
      const spy = jest.fn();
      client.onFormDataChange(spy);
      client.formDataStore.getState().setValue('x', 2);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'x', value: 2, previousValue: 1, dataType: 'default' }),
      );
    });

    it('unsubscribes correctly', () => {
      const client = new FormClient({ defaultDataType: 'default' });
      client.setFormData({ x: 1 });
      const spy = jest.fn();
      const unsubscribe = client.onFormDataChange(spy);
      unsubscribe();
      client.formDataStore.getState().setValue('x', 2);
      expect(spy).not.toHaveBeenCalled();
    });

    it('fires with correct dataType for secondary model', () => {
      const client = new FormClient({ defaultDataType: 'model-a' });
      client.setFormData({ x: 1 }, 'model-b');
      const spy = jest.fn();
      client.onFormDataChange(spy);
      client.formDataStore.getState().setValue('x', 2, 'model-b');
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ dataType: 'model-b' }));
    });
  });
});
