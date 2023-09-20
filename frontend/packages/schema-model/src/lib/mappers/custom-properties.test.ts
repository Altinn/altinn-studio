import { findCustomAttributes } from './custom-properties';
import { Keyword } from '../../types';

test('findCustomAttributes', () => {
  const customData = 'custom-data';
  expect(
    findCustomAttributes({
      [Keyword.Enum]: [],
      customData,
    }),
  ).toStrictEqual({ customData });
});
