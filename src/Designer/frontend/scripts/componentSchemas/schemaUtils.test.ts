import { ensureTypeWithEnums } from './schemaUtils';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

describe('ensureTypeWithEnums', () => {
  it('should set schema.type to "string" when schema.enum contains a string', () => {
    const schema: KeyValuePairs = {
      enum: ['value1', 'value2'],
    };
    ensureTypeWithEnums(schema);
    expect(schema.type).toBe('string');
  });

  it('should set schema.type to "number" when schema.enum contains a number', () => {
    const schema: KeyValuePairs = {
      enum: [1, 2, 3],
    };
    ensureTypeWithEnums(schema);
    expect(schema.type).toBe('number');
  });

  it('should set schema.items.type to "string" when schema.items.enum contains a string', () => {
    const schema: KeyValuePairs = {
      items: {
        enum: ['item1', 'item2'],
      },
    };
    ensureTypeWithEnums(schema);
    expect(schema.items.type).toBe('string');
  });

  it('should set schema.items.type to "number" when schema.items.enum contains a number', () => {
    const schema: KeyValuePairs = {
      items: {
        enum: [10, 20, 30],
      },
    };
    ensureTypeWithEnums(schema);
    expect(schema.items.type).toBe('number');
  });

  it('should not set schema.type when schema.enum is empty', () => {
    const schema: KeyValuePairs = {
      enum: [],
    };
    ensureTypeWithEnums(schema);
    expect(schema.type).toBeUndefined();
  });

  it('should not set schema.items.type when schema.items.enum is empty', () => {
    const schema: KeyValuePairs = {
      items: {
        enum: [],
      },
    };
    ensureTypeWithEnums(schema);
    expect(schema.items.type).toBeUndefined();
  });

  it('should not modify schema if there is no enum or items.enum', () => {
    const schema: KeyValuePairs = {
      type: 'array',
    };
    ensureTypeWithEnums(schema);
    expect(schema).toEqual({ type: 'array' });
  });
});
