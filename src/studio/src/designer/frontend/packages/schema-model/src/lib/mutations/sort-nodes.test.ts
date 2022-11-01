import { createNodeBase } from '../utils';
import { expect } from '@jest/globals';
import { sortNodesByChildren } from './sort-nodes';
import { ROOT_POINTER } from '../constants';

test('that we can sortNodes', () => {
  const rootNode = createNodeBase(ROOT_POINTER);
  const child1 = createNodeBase('someother path');
  const child3 = createNodeBase('somepath');
  rootNode.children.push(child1.pointer);
  rootNode.children.push(child3.pointer);
  const child2 = createNodeBase('someother path', 'another one here');
  child1.children.push(child2.pointer);
  const testArray = [child1, child2, child3, rootNode];
  for (let i = 0; i < 5; i++) {
    testArray.sort(() => Math.random() - 0.5);
    const sorted = sortNodesByChildren(testArray);
    expect(sorted).toStrictEqual([rootNode, child1, child2, child3]);
  }
});
