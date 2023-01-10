import { arrayToString, stringToArray } from './stringUtils';

test('comma separated string should be converted to string[]', () => {
  const result = stringToArray('a,b,c');
  expect(result).toMatchObject(['a', 'b', 'c']);
});

test('comma separated string should be converted to string[] without whitespace', () => {
  const result = stringToArray('d, e, f');
  expect(result).toMatchObject(['d', 'e', 'f']);
});

test('comma separated string with numbers should be converted to string[] without whitespace', () => {
  const result = stringToArray('1, 2, 3');
  expect(result).toMatchObject(['1', '2', '3']);
});

test('array of strings should be converted to comma separated string', () => {
  const result = arrayToString(['a', 'b', 'c']);
  expect(result).toBe('a,b,c');
});
