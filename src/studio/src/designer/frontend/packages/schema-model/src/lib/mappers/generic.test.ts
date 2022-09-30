import { findGenericKeywordsOnNode, genericKeywords } from './generic';
import { Keywords } from '../types';
import { IntRestrictionKeys } from '../restrictions';

test('should return just keywords', () => {
  const generics = findGenericKeywordsOnNode({
    [Keywords.Const]: 'ALLTID',
    'some non keyword': 'dfasd',
    [IntRestrictionKeys.maximum]: 10,
  });
  expect(Object.keys(generics)).toEqual(genericKeywords);
  expect(generics[Keywords.Const]).toBe('ALLTID');
});
