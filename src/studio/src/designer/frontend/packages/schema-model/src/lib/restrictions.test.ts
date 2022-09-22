import { findRestrictionsOnNode, IntegerRestrictions } from './restrictions';

test('should return just restrictions', () => {
  const restictions = findRestrictionsOnNode({
    [IntegerRestrictions.exclusiveMaximum]: 4,
    'not a restrition': 'sdfasd',
  });
  expect(restictions).toEqual({
    [IntegerRestrictions.exclusiveMaximum]: 4,
  });
});
