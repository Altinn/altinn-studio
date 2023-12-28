import { applyChanges } from 'src/features/formData/applyChanges';

describe('applyChanges', () => {
  it('should merge two distinct changes', () => {
    const applyTo = { a: 1, b: 2 };
    applyChanges({
      prev: { a: 1, b: 2 },
      next: { a: 1, b: 3 },
      applyTo,
    });
    expect(applyTo).toEqual({
      a: 1,
      b: 3,
    });
  });

  it('should remove keys that are undefined in next', () => {
    const applyTo = { a: 1, b: 2 };
    applyChanges({
      prev: { a: 1, b: 2 },
      next: { a: 1, b: undefined },
      applyTo,
    });
    expect(applyTo).toEqual({
      a: 1,
    });
  });

  it('should add keys that are undefined in prev', () => {
    const applyTo = { a: 1 };
    applyChanges({
      prev: { a: 1 },
      next: { a: 1, b: 2 },
      applyTo,
    });
    expect(applyTo).toEqual({
      a: 1,
      b: 2,
    });
  });

  it('should handle empty objects', () => {
    const applyTo = {};
    applyChanges({
      prev: {},
      next: {},
      applyTo,
    });
    expect(applyTo).toEqual({});
  });

  it('should overwrite data in applyTo when given an update in next', () => {
    const applyTo = { a: 1, b: 5 };
    applyChanges({
      prev: { a: 1, b: 2 },
      next: { a: 1, b: 3 },
      applyTo,
    });
    expect(applyTo).toEqual({
      a: 1,
      b: 3,
    });
  });

  it('should keep data in applyTo when the same object is added in next', () => {
    const applyTo = { a: { b: 1 } };
    applyChanges({
      prev: {},
      next: { a: { c: 1 } },
      applyTo,
    });
    expect(applyTo).toEqual({
      a: { b: 1, c: 1 },
    });
  });
});
