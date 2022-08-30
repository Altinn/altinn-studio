import {
  ContainerPos,
  getContainerPosition,
  insertArrayElementAtPos,
  swapArrayElements,
} from './dnd-helpers';
import { randomUUID } from 'crypto';
import { XYCoord } from 'react-dnd';

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

test('getContainerPosition returns correct positions', () => {
  const boundingBox: DOMRect = {
    bottom: 406.6875,
    height: 111.921875,
    left: 353,
    right: 1085,
    top: 294.765625,
    width: 732,
    x: 353,
    y: 294.765625,
    toJSON: () => '',
  };
  const scenarios: [number, string][] = [
    [300, ContainerPos.TOP],
    [290, undefined],
    [400, ContainerPos.BOTTOM],
    [500, undefined],
  ];
  scenarios.forEach((scenario) => {
    const [y, expected] = scenario;
    const xyCord: XYCoord = { x: 500, y };
    const result = getContainerPosition(boundingBox, xyCord);
    expect(result).toBe(expected);
  });
});

/**

 */

test('should insert element at pos', () => {
  const arr = 'abc'.split('');
  expect(insertArrayElementAtPos(arr, 'M', 9).join('')).toBe('abcM');
  expect(insertArrayElementAtPos(arr, 'M', 0).join('')).toBe('Mabc');
  expect(insertArrayElementAtPos(arr, 'M', 1).join('')).toBe('aMbc');
  expect(insertArrayElementAtPos(arr, 'M', 3).join('')).toBe('abcM');

  expect(() => insertArrayElementAtPos(arr, 'M', -1).join('')).toThrowError();
});
