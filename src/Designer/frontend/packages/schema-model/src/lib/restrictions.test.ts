import { findRestrictionsOnNode } from './restrictions';
import { IntRestrictionKey } from '../types';

test('should return just restrictions', () => {
  const restictions = findRestrictionsOnNode({
    [IntRestrictionKey.maximum]: 4,
    'not a restrition': 'sdfasd',
  });
  expect(restictions).toEqual({
    [IntRestrictionKey.maximum]: 4,
  });
});
