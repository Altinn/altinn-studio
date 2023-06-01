import { findCustomAttributes } from './custom-properties';
import { Keyword } from '../../types';

test('that we are handling custom properties ', () => {
  const customData = 'custom-data';
  expect(
    findCustomAttributes({
      [Keyword.Enum]: [],
      customData,
    })
  ).toStrictEqual({ customData });
});
