import { swapArrayElements } from './dnd-helpers';
import { randomUUID } from 'crypto';

test('it should work', () => {
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
