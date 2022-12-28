import { findRestrictionsOnNode, IntRestrictionKeys } from './restrictions';

test('should return just restrictions', () => {
  const restictions = findRestrictionsOnNode({
    [IntRestrictionKeys.maximum]: 4,
    'not a restrition': 'sdfasd',
  });
  expect(restictions).toEqual({
    [IntRestrictionKeys.maximum]: 4,
  });
});
