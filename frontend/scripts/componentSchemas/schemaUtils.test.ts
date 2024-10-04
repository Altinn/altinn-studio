import { ensureTypeWithEnums } from './schemaUtils';

describe('ensureTypeWithEnums', () => {
  it('should set schema.type to "string" when schema.enum contains a string', () => {
    const schema: any = {
      enum: ['value1', 'value2'],
    };
    ensureTypeWithEnums(schema);
    expect(schema.type).toBe('string');
  });

  it('should set schema.type to "number" when schema.enum contains a number', () => {
    const schema: any = {
      enum: [1, 2, 3],
    };
    ensureTypeWithEnums(schema);
    expect(schema.type).toBe('number');
  });

  it('should set schema.items.type to "string" when schema.items.enum contains a string', () => {
    const schema: any = {
      items: {
        enum: ['item1', 'item2'],
      },
    };
    ensureTypeWithEnums(schema);
    expect(schema.items.type).toBe('string');
  });

  it('should set schema.items.type to "number" when schema.items.enum contains a number', () => {
    const schema: any = {
      items: {
        enum: [10, 20, 30],
      },
    };
    ensureTypeWithEnums(schema);
    expect(schema.items.type).toBe('number');
  });

  it('should not set schema.type when schema.enum is empty', () => {
    const schema: any = {
      enum: [],
    };
    ensureTypeWithEnums(schema);
    expect(schema.type).toBeUndefined();
  });

  it('should not set schema.items.type when schema.items.enum is empty', () => {
    const schema: any = {
      items: {
        enum: [],
      },
    };
    ensureTypeWithEnums(schema);
    expect(schema.items.type).toBeUndefined();
  });

  it('should not modify schema if there is no enum or items.enum', () => {
    const schema: any = {
      type: 'object',
    };
    ensureTypeWithEnums(schema);
    expect(schema).toEqual({ type: 'object' });
  });
});
