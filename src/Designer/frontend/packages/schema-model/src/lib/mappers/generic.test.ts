import { findGenericKeywordsOnNode, genericKeywords } from './generic';
import { Keyword, IntRestrictionKey } from '../../types';
import {} from '../restrictions';

test('should return just keywords', () => {
  const generics = findGenericKeywordsOnNode({
    [Keyword.Const]: 'ALLTID',
    'some non keyword': 'dfasd',
    [IntRestrictionKey.maximum]: 10,
  });
  expect(Object.keys(generics)).toEqual(genericKeywords);
  expect(generics[Keyword.Const]).toBe('ALLTID');
});
