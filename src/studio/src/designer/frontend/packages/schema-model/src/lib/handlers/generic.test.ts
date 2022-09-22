import { findGenericKeywordsOnNode, genericKeywords } from './generic';
import { Keywords } from '../types';
import { IntegerRestrictions } from '../restrictions';

test('should return just keywords', () => {
  const generics = findGenericKeywordsOnNode({
    [Keywords.Const]: 'ALLTID',
    'some non keyword': 'dfasd',
    [IntegerRestrictions.maximum]: 10,
  });
  expect(Object.keys(generics)).toEqual(genericKeywords);
  expect(generics[Keywords.Const]).toBe('ALLTID');
});
