import { findRestrictionsOnNode } from './restrictions';
import { IntRestrictionKey } from '../types';

test('should return just restrictions', () => {
  const restrictions = findRestrictionsOnNode({
    [IntRestrictionKey.maximum]: 4,
    'not a restriction': 'sdfasd',
  });
  expect(restrictions).toEqual({
    [IntRestrictionKey.maximum]: 4,
  });
});
