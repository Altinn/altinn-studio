import { insertArrayElementAtPos, swapArrayElements } from './array-functions';
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
