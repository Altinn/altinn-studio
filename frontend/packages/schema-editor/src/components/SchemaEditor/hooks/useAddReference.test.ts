import {
  extractNameFromPointer,
  isReference,
  SchemaModel,
  type ReferenceNode,
} from '@altinn/schema-model';
import {
  definitionNodeMock,
  combinationNodeMock,
  uiSchemaNodesMock,
} from '../../../../test/mocks/uiSchemaMock';
import type { SchemaEditorAppContextProps } from '../../../contexts/SchemaEditorAppContext';
import { renderHookWithProviders } from '../../../../test/renderHookWithProviders';
import type { HandleAdd, ItemPosition } from 'app-shared/types/dndTypes';
import { useAddReference } from './useAddReference';
import type { SavableSchemaModel } from '../../../classes/SavableSchemaModel';
import { ArrayUtils } from '@studio/pure-functions';

describe('useAddReference', () => {
  const setup = () => {
    const save = jest.fn();
    const schemaModel = SchemaModel.fromArray(uiSchemaNodesMock).deepClone();
    const appContextProps: Partial<SchemaEditorAppContextProps> = { schemaModel, save };
    const { result } = renderHookWithProviders({ appContextProps })(useAddReference);
    const add: HandleAdd<string> = result.current;
    return { add, save };
  };

  it('Adds a reference to the given position', () => {
    const { add, save } = setup();
    const nameOfDefinition = extractNameFromPointer(definitionNodeMock.pointer);
    const pointerOfParent = combinationNodeMock.pointer;
    const indexInNewParent = 1;
    const target: ItemPosition = { parentId: pointerOfParent, index: indexInNewParent };
    add(nameOfDefinition, target);
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel: SavableSchemaModel = save.mock.lastCall[0];
    const childrenOfNewParent = savedModel.getChildNodes(pointerOfParent);
    const addedChild = childrenOfNewParent[indexInNewParent];
    expect(isReference(addedChild)).toBe(true);
    const addedReferenceNode = addedChild as ReferenceNode;
    expect(addedReferenceNode.reference).toEqual(definitionNodeMock.pointer);
  });

  it('Adds a reference to the end if the given position is -1', () => {
    const { add, save } = setup();
    const nameOfDefinition = extractNameFromPointer(definitionNodeMock.pointer);
    const pointerOfParent = combinationNodeMock.pointer;
    const givenIndex = -1;
    const target: ItemPosition = { parentId: pointerOfParent, index: givenIndex };
    add(nameOfDefinition, target);
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel: SavableSchemaModel = save.mock.lastCall[0];
    const childrenOfNewParent = savedModel.getChildNodes(pointerOfParent);
    const addedChild = ArrayUtils.last(childrenOfNewParent);
    expect(isReference(addedChild)).toBe(true);
    const addedReferenceNode = addedChild as ReferenceNode;
    expect(addedReferenceNode.reference).toEqual(definitionNodeMock.pointer);
  });

  it('Adds a reference to the end if the given position is the same as the number of elements', () => {
    const { add, save } = setup();
    const nameOfDefinition = extractNameFromPointer(definitionNodeMock.pointer);
    const pointerOfParent = combinationNodeMock.pointer;
    const givenIndex = combinationNodeMock.children.length;
    const target: ItemPosition = { parentId: pointerOfParent, index: givenIndex };
    add(nameOfDefinition, target);
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel: SavableSchemaModel = save.mock.lastCall[0];
    const childrenOfNewParent = savedModel.getChildNodes(pointerOfParent);
    const addedChild = ArrayUtils.last(childrenOfNewParent);
    expect(isReference(addedChild)).toBe(true);
    const addedReferenceNode = addedChild as ReferenceNode;
    expect(addedReferenceNode.reference).toEqual(definitionNodeMock.pointer);
  });
});
