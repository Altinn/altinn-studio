import { createNodeBase } from '../utils';
import { expect } from '@jest/globals';
import { sortNodesByChildren } from './sort-nodes';
import { ROOT_POINTER } from '../constants';

test('sortNodesByChildren', () => {
  const rootNode = createNodeBase(ROOT_POINTER);
  const child1 = createNodeBase('someother path');
  const child3 = createNodeBase('somepath');
  rootNode.children.push(child1.schemaPointer);
  rootNode.children.push(child3.schemaPointer);
  const child2 = createNodeBase('someother path', 'another one here');
  child1.children.push(child2.schemaPointer);
  const testArray = [child1, child2, child3, rootNode];
  for (let i = 0; i < 5; i++) {
    testArray.sort(() => Math.random() - 0.5);
    const sorted = sortNodesByChildren(testArray);
    expect(sorted).toStrictEqual([rootNode, child1, child2, child3]);
  }
});
