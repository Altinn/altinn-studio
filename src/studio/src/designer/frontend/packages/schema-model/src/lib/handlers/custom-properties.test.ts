import { handleCustomProperties } from './custom-properties';
import { Keywords } from '../types';

test('that we are handling custom properties ', () => {
  const customData = '';
  expect(
    handleCustomProperties({
      [Keywords.Enum]: [],
      customData,
    }),
  ).toStrictEqual({ customData });
});
