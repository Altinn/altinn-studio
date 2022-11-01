import { sortArray } from './arrayLogic';

test('that arrayLogic works', () => {
  const sortedArray = sortArray();
  expect(typeof sortedArray).toBe('function');
});
