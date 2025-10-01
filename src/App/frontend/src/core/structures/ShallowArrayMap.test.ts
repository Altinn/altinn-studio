import { ShallowArrayMap } from 'src/core/structures/ShallowArrayMap';

describe('ShallowArrayMap', () => {
  it('should work with a simple one-item array', () => {
    const map = new ShallowArrayMap();

    expect(map.has([1])).toBe(false);
    map.set([1], 'a');
    expect(map.has([1])).toBe(true);
    expect(map.get([1])).toBe('a');
  });

  it('should work with zero-length arrays', () => {
    const map = new ShallowArrayMap();

    expect(map.has([])).toBe(false);
    map.set([], 'a');
    expect(map.has([])).toBe(true);
    expect(map.get([])).toBe('a');
  });

  it('should work with a two-item array', () => {
    const map = new ShallowArrayMap();

    expect(map.has([1, 2])).toBe(false);
    map.set([1, 2], 'a');
    expect(map.has([1, 2])).toBe(true);
    expect(map.get([1, 2])).toBe('a');
  });

  it('should work with complex object as keys', () => {
    const map = new ShallowArrayMap();

    const key1 = { a: 1 };

    expect(map.has([key1])).toBe(false);
    map.set([key1], 'a');
    expect(map.has([key1])).toBe(true);

    // Looking it up with a new object reference should not work
    expect(map.has([{ a: 1 }])).toBe(false);
    expect(map.get([{ a: 1 }])).toBe(undefined);
  });

  it('should return a flat values[] array even if the keys have multiple lengths', () => {
    const map = new ShallowArrayMap();
    map.set([1, 2], 'a');
    map.set([3, new Date()], 'b');
    map.set([4, 5, 6], 'c');
    map.set([4, 8, 9, 10], 'd');

    expect(map.values()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('should be possible to store a Map as a value', () => {
    const map = new ShallowArrayMap<Map<string, string>>();
    const value = new Map<string, string>();
    value.set('a', 'b');
    map.set([1], value);

    expect(map.get([1])).toBe(value);
    expect(map.get([1])?.get('a')).toBe('b');

    expect(map.entries()).toEqual([[[1], value]]);
  });
});
