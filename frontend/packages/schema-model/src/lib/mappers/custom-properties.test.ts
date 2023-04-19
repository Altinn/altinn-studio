import { findCustomAttributes } from './custom-properties';
import { Keywords } from '../types';

test('that we are handling custom properties ', () => {
  const customData = 'custom-data';
  expect(
    findCustomAttributes({
      [Keywords.Enum]: [],
      customData,
    })
  ).toStrictEqual({ customData });
});
