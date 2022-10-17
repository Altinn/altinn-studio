import {
  arrayIntersection,
  arrayUnique,
  insertArrayElementAtPos,
  removeArrayElement,
  swapArrayElements,
} from './array-functions';
import { randomUUID } from 'crypto';

test('insertArrayElementAtPos should insert element at pos', () => {
  const arr = 'abc'.split('');
  expect(insertArrayElementAtPos(arr, 'M', 9).join('')).toBe('abcM');
  expect(insertArrayElementAtPos(arr, 'M', 0).join('')).toBe('Mabc');
  expect(insertArrayElementAtPos(arr, 'M', 1).join('')).toBe('aMbc');
  expect(insertArrayElementAtPos(arr, 'M', 3).join('')).toBe('abcM');

  expect(() => insertArrayElementAtPos(arr, 'M', -1).join('')).toThrowError();
});

test('swapArrayElements should swap elements', () => {
  const arr: string[] = [
    randomUUID(),
    randomUUID(),
    randomUUID(),
    randomUUID(),
    randomUUID(),
    randomUUID(),
  ];
  const newnew = swapArrayElements(arr, arr[1], arr[2]);
  expect(newnew).toHaveLength(arr.length);
  expect(newnew[2]).toBe(arr[1]);
  expect(newnew[1]).toBe(arr[2]);
});

test('that arrayIntersection works', () => {
  expect(arrayIntersection([1, 2, 3], [3, '4', 5])).toStrictEqual([3]);
  expect(arrayIntersection([1, 2, 3], [4, '4', 5])).toStrictEqual([]);
  expect(arrayIntersection([1, 2, 3], [3, '4', 2])).toStrictEqual([2, 3]);
  expect(arrayIntersection([1, 2, 3], [1, 2, 3])).toStrictEqual([1, 2, 3]);
});

test('that arrayUnique works', () => {
  expect(arrayUnique([1, 2, 3, 3])).toStrictEqual([1, 2, 3]);
  expect(arrayUnique([1, 2, 3, '3'])).toStrictEqual([1, 2, 3, '3']);
  expect(arrayUnique([2, 2, 3, 3])).toStrictEqual([2, 3]);
  expect(arrayUnique([])).toStrictEqual([]);
});

test('that we can remove array element', () => {
  expect(removeArrayElement([1, 2, 3], 2)).toStrictEqual([1, 3]);
  expect(removeArrayElement([1, 2, 3], 1)).toStrictEqual([2, 3]);
  expect(removeArrayElement([1, 2, 3], 3)).toStrictEqual([1, 2]);
  expect(removeArrayElement([1, 2, 3], '2')).toStrictEqual([1, 2, 3]);
});
