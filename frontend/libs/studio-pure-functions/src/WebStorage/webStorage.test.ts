import { typedLocalStorage } from './webStorage';

describe('typedLocalStorage', () => {
  it('should return strings as string', () => {
    typedLocalStorage.setItem<string>('test', 'test');
    expect(typedLocalStorage.getItem<string>('test')).toBe('test');
  });

  it('should return numbers as numbers', () => {
    typedLocalStorage.setItem<number>('age', 18);
    expect(typedLocalStorage.getItem<number>('age')).toBe(18);
  });

  it('should return objects as objects', () => {
    typedLocalStorage.setItem<{ name: string; age: number }>('user', { name: 'John', age: 18 });
    expect(typedLocalStorage.getItem<{ name: string; age: number }>('user')).toEqual({
      name: 'John',
      age: 18,
    });
  });

  it('should return array of numbers as array of numbers', () => {
    typedLocalStorage.setItem<number[]>('arr', [1, 2, 3]);
    expect(typedLocalStorage.getItem<number[]>('arr')).toEqual([1, 2, 3]);
  });

  it('should return array of strings as array of string', () => {
    typedLocalStorage.setItem<string[]>('arr', ['1', '2', '3']);
    expect(typedLocalStorage.getItem<string[]>('arr')).toEqual(['1', '2', '3']);
  });

  it('should be possible to set empty string', () => {
    typedLocalStorage.setItem<string>('empty', '');
    expect(typedLocalStorage.getItem<string>('empty')).toBe('');
  });

  it('should remove item', () => {
    typedLocalStorage.setItem<string>('test', 'test');
    expect(typedLocalStorage.getItem<string>('test')).toBe('test');

    typedLocalStorage.removeItem('test');
    expect(typedLocalStorage.getItem<string | undefined>('test')).toBeNull();
  });

  it('should not store undefined values', async () => {
    const key = 'undefinedValueKey';
    const value = null;
    typedLocalStorage.setItem<string>(key, undefined);
    expect(typedLocalStorage.getItem(key)).toBe(value);
    expect(window?.localStorage.getItem(key)).toBe(null);
  });

  it('should remove invalid values', async () => {
    const key = 'invalidValueKey';
    const value = undefined;
    const warSpy = jest.spyOn(global.console, 'warn').mockImplementation();
    window?.localStorage.setItem(key, value as unknown as string);
    expect(typedLocalStorage.getItem(key)).toBe(value);
    expect(window?.localStorage.getItem(key)).toBe(null);
    expect(warSpy).toHaveBeenCalledTimes(1);
    warSpy.mockRestore();
  });
});

afterAll(() => {
  window.localStorage.clear();
});
