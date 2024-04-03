import { renameNodePointer } from './rename-node';
import { parentNodeMock, uiSchemaMock } from '../../../test/uiSchemaMock';
import { getPointers } from '../mappers/getPointers';
import { getNodeByPointer } from '../selectors';
import { expect } from '@jest/globals';
import type { CombinationNode } from '../../types/CombinationNode';

describe('renameNodePointer', () => {
  const oldPointer = parentNodeMock.pointer;
  const newPointer = '#/properties/lipsum';
  const result = renameNodePointer(uiSchemaMock, oldPointer, newPointer);
  const renamedNode = getNodeByPointer(result, newPointer) as CombinationNode;
  const newPointers = getPointers(result);

  it('Renames the given node pointer', () => {
    expect(renamedNode).toEqual({
      ...parentNodeMock,
      pointer: newPointer,
      children: expect.anything(),
    });
    expect(newPointers).not.toContain(oldPointer);
  });

  it('Renames the children pointers', () => {
    const oldChildPointers = getPointers(uiSchemaMock).filter((pointer) =>
      pointer.startsWith(oldPointer),
    );
    oldChildPointers.forEach((oldChildPointer) => {
      expect(newPointers).toContain(oldChildPointer.replace(oldPointer, newPointer));
      expect(newPointers).not.toContain(oldChildPointer);
    });
  });

  it('Updates the children array of the renamed node', () => {
    expect(renamedNode.children).toEqual(
      parentNodeMock.children.map((child) => child.replace(oldPointer, newPointer)),
    );
  });

  it('Throws error on unknown pointer', () => {
    const uiSchemaNodes = uiSchemaMock;
    expect(() => renameNodePointer(uiSchemaNodes, 'fdasdfas', 'asdfsadfsaasdf')).toThrowError();
  });
});
