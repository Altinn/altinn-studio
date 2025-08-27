import { renderHookWithProviders } from '../../../../test/renderHookWithProviders';
import { useMoveProperty } from './useMoveProperty';
import type { SchemaEditorAppContextProps } from '../../../contexts/SchemaEditorAppContext';
import type { HandleMove, ItemPosition } from 'app-shared/types/dndTypes';
import {
  extractNameFromPointer,
  ROOT_POINTER,
  SchemaModel,
  validateTestUiSchema,
  UNIQUE_POINTER_PREFIX,
  Keyword,
} from '@altinn/schema-model/index';
import {
  childOfReferredNodeMock,
  combinationNodeMock,
  fieldNode1Mock,
  nodeWithSameNameAsObjectChildMock,
  objectChildMock,
  objectNodeMock,
  referenceNodeMock,
  referredNodeMock,
  rootNodeMock,
  toggableNodeMock,
  uiSchemaNodesMock,
} from '../../../../test/mocks/uiSchemaMock';
import type { SavableSchemaModel } from '../../../classes/SavableSchemaModel';
import { ArrayUtils } from 'libs/studio-pure-functions/src';

const uniquePointerOfRoot = UNIQUE_POINTER_PREFIX + ROOT_POINTER;

describe('useMoveProperty', () => {
  const setup = (schemaEditorAppContextProps?: Partial<SchemaEditorAppContextProps>) => {
    const save = jest.fn();
    const schemaModel = SchemaModel.fromArray(uiSchemaNodesMock).deepClone();
    const appContextProps: Partial<SchemaEditorAppContextProps> = {
      schemaModel,
      save,
      ...schemaEditorAppContextProps,
    };
    const { result } = renderHookWithProviders({ appContextProps })(useMoveProperty);
    const move: HandleMove = result.current;
    return { move, save, schemaModel };
  };

  it('Moves a property to the given position', () => {
    const { move, save } = setup();
    const pointerOfNodeToMove = fieldNode1Mock.schemaPointer;
    const pointerOfNewParent = objectNodeMock.schemaPointer;
    const indexInNewParent = 1;
    const target: ItemPosition = { parentId: pointerOfNewParent, index: indexInNewParent };
    move(pointerOfNodeToMove, target);
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel: SavableSchemaModel = save.mock.lastCall[0];
    const childrenOfNewParent = savedModel.getChildNodes(pointerOfNewParent);
    const addedChild = childrenOfNewParent[indexInNewParent];
    const nameOfMovedNode = extractNameFromPointer(pointerOfNodeToMove);
    const nameOfAddedChild = extractNameFromPointer(addedChild.schemaPointer);
    expect(nameOfAddedChild).toEqual(nameOfMovedNode);
    validateTestUiSchema(savedModel.asArray());
  });

  it('Moves a property to the given position when it is on the root', () => {
    const { move, save } = setup();
    const pointerOfNodeToMove = fieldNode1Mock.schemaPointer;
    const indexInNewParent = 1;
    const target: ItemPosition = { parentId: uniquePointerOfRoot, index: indexInNewParent };
    move(pointerOfNodeToMove, target);
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel: SavableSchemaModel = save.mock.lastCall[0];
    const rootChildren = savedModel.getRootChildren();
    const addedRootChild = rootChildren[indexInNewParent];
    const nameOfMovedNode = extractNameFromPointer(pointerOfNodeToMove);
    const nameOfAddedChild = extractNameFromPointer(addedRootChild.schemaPointer);
    expect(nameOfAddedChild).toEqual(nameOfMovedNode);
    validateTestUiSchema(savedModel.asArray());
  });

  it('Moves a property to the given position when it is on the root and the target index is 0', () => {
    const { move, save } = setup();
    const pointerOfNodeToMove = fieldNode1Mock.schemaPointer;
    const target: ItemPosition = { parentId: uniquePointerOfRoot, index: 0 };
    move(pointerOfNodeToMove, target);
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel: SavableSchemaModel = save.mock.lastCall[0];
    const rootChildren = savedModel.getRootChildren();
    const addedRootChild = rootChildren[0];
    const nameOfMovedNode = extractNameFromPointer(pointerOfNodeToMove);
    const nameOfAddedChild = extractNameFromPointer(addedRootChild.schemaPointer);
    expect(nameOfAddedChild).toEqual(nameOfMovedNode);
    validateTestUiSchema(savedModel.asArray());
  });

  it('Moves a property to the given position when it is on the root and the target index is equal to the number of root properties', () => {
    const { move, save } = setup();
    const pointerOfNodeToMove = fieldNode1Mock.schemaPointer;
    const index = rootNodeMock.children.length;
    const target: ItemPosition = { parentId: uniquePointerOfRoot, index };
    move(pointerOfNodeToMove, target);
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel: SavableSchemaModel = save.mock.lastCall[0];
    const rootChildren = savedModel.getRootChildren();
    const addedRootChild = rootChildren[index];
    const nameOfMovedNode = extractNameFromPointer(pointerOfNodeToMove);
    const nameOfAddedChild = extractNameFromPointer(addedRootChild.schemaPointer);
    expect(nameOfAddedChild).toEqual(nameOfMovedNode);
    validateTestUiSchema(savedModel.asArray());
  });

  it('Moves the node to the end when the given target index is -1 and the parent is the root node', () => {
    const { move, save } = setup();
    const pointerOfNodeToMove = objectNodeMock.schemaPointer;
    const index = -1;
    const target: ItemPosition = { parentId: uniquePointerOfRoot, index };
    move(pointerOfNodeToMove, target);
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel: SavableSchemaModel = save.mock.lastCall[0];
    const rootChildren = savedModel.getRootChildren();
    const addedRootChild = ArrayUtils.last(rootChildren);
    const nameOfMovedNode = extractNameFromPointer(pointerOfNodeToMove);
    const nameOfAddedChild = extractNameFromPointer(addedRootChild.schemaPointer);
    expect(nameOfAddedChild).toEqual(nameOfMovedNode);
    validateTestUiSchema(savedModel.asArray());
  });

  it('Moves a property to the given combination node', () => {
    const { move, save } = setup();
    const pointerOfNodeToMove = objectChildMock.schemaPointer;
    const pointerOfNewParent = combinationNodeMock.schemaPointer;
    const numberOfChildrenInNewParent = combinationNodeMock.children.length;
    const indexInNewParent = 0;
    const target: ItemPosition = { parentId: pointerOfNewParent, index: indexInNewParent };
    move(pointerOfNodeToMove, target);
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel: SavableSchemaModel = save.mock.lastCall[0];
    const childrenOfNewParent = savedModel.getChildNodes(pointerOfNewParent);
    expect(childrenOfNewParent.length).toEqual(numberOfChildrenInNewParent + 1);
  });

  it('Moves a property when it is moved inside the same parent', () => {
    const { move, save } = setup();
    const pointerOfNodeToMove = fieldNode1Mock.schemaPointer;
    const pointerOfNewParent = combinationNodeMock.schemaPointer;
    const numberOfChildrenInNewParent = combinationNodeMock.children.length;
    const indexInNewParent = 1;
    const target: ItemPosition = { parentId: pointerOfNewParent, index: indexInNewParent };
    move(pointerOfNodeToMove, target);
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel: SavableSchemaModel = save.mock.lastCall[0];
    const childrenOfNewParent = savedModel.getChildNodes(pointerOfNewParent);
    expect(childrenOfNewParent.length).toEqual(numberOfChildrenInNewParent);
  });

  it('Does not move the property when there is already a property with the same name in the target parent', () => {
    const { move, save } = setup();
    const pointerOfNodeToMove = nodeWithSameNameAsObjectChildMock.schemaPointer;
    const pointerOfNewParent = objectNodeMock.schemaPointer;
    const indexInNewParent = 0;
    const target: ItemPosition = { parentId: pointerOfNewParent, index: indexInNewParent };
    jest.spyOn(window, 'alert').mockImplementation(jest.fn());
    move(pointerOfNodeToMove, target);
    expect(save).toHaveBeenCalledTimes(0);
  });

  it('Updates the selected unique node pointer if moving a node that is selected into an object', () => {
    const setSelectedUniquePointerMock = jest.fn();
    const { move, save } = setup({
      selectedUniquePointer: `${UNIQUE_POINTER_PREFIX}${fieldNode1Mock.schemaPointer}`,
      setSelectedUniquePointer: setSelectedUniquePointerMock,
    });
    const pointerOfNodeToMove = `${UNIQUE_POINTER_PREFIX}${fieldNode1Mock.schemaPointer}`;
    const index = rootNodeMock.children.length;
    const target: ItemPosition = { parentId: ROOT_POINTER, index };
    move(pointerOfNodeToMove, target);
    expect(setSelectedUniquePointerMock).toHaveBeenCalledTimes(1);
    const savedModel: SavableSchemaModel = save.mock.lastCall[0];
    const rootChildren = savedModel.getRootChildren();
    const addedRootChild = rootChildren[index];
    expect(setSelectedUniquePointerMock).toHaveBeenCalledWith(
      `${UNIQUE_POINTER_PREFIX}${addedRootChild.schemaPointer}`,
    );
  });

  it('Updates the selected unique node pointer if moving a node that is selected into a combination node', () => {
    const setSelectedUniquePointerMock = jest.fn();
    const pointerOfNodeToMove = UNIQUE_POINTER_PREFIX + toggableNodeMock.schemaPointer;
    const { move } = setup({
      selectedUniquePointer: pointerOfNodeToMove,
      setSelectedUniquePointer: setSelectedUniquePointerMock,
    });
    const pointerOfNewParent = `${UNIQUE_POINTER_PREFIX}${combinationNodeMock.schemaPointer}`;
    const indexInNewParent = 0;
    const target: ItemPosition = { parentId: pointerOfNewParent, index: indexInNewParent };
    move(pointerOfNodeToMove, target);
    expect(setSelectedUniquePointerMock).toHaveBeenCalledTimes(1);
    expect(setSelectedUniquePointerMock).toHaveBeenCalledWith(
      `${pointerOfNewParent}/anyOf/${indexInNewParent}`,
    );
  });

  it('Updates the selected unique node pointer when moving a node that is selected out of a referenced object', () => {
    const setSelectedUniquePointerMock = jest.fn();
    const schemaPointerOfNodeToMove = childOfReferredNodeMock.schemaPointer;
    const nameOfNodeToMove = extractNameFromPointer(schemaPointerOfNodeToMove);
    const uniquePointerOfParent = UNIQUE_POINTER_PREFIX + referenceNodeMock.schemaPointer;
    const uniquePointerOfNodeToMove = `${uniquePointerOfParent}/${Keyword.Properties}/${nameOfNodeToMove}`;
    const expectedFinalUniquePointer = `${uniquePointerOfRoot}/${Keyword.Properties}/${nameOfNodeToMove}`;
    const { move } = setup({
      selectedUniquePointer: uniquePointerOfNodeToMove,
      setSelectedUniquePointer: setSelectedUniquePointerMock,
    });
    const target: ItemPosition = { parentId: uniquePointerOfRoot, index: 0 };
    move(uniquePointerOfNodeToMove, target);
    expect(setSelectedUniquePointerMock).toHaveBeenCalledTimes(1);
    expect(setSelectedUniquePointerMock).toHaveBeenCalledWith(expectedFinalUniquePointer);
  });

  it('Updates the selected unique node pointer when moving a node that is selected into a referenced object', () => {
    const setSelectedUniquePointerMock = jest.fn();
    const schemaPointerOfNodeToMove = objectNodeMock.schemaPointer;
    const nameOfNodeToMove = extractNameFromPointer(schemaPointerOfNodeToMove);
    const uniquePointerOfNodeToMove = `${uniquePointerOfRoot}/${Keyword.Properties}/${nameOfNodeToMove}`;
    const uniquePointerOfTargetParent = UNIQUE_POINTER_PREFIX + referenceNodeMock.schemaPointer;
    const expectedFinalUniquePointer = `${uniquePointerOfTargetParent}/${Keyword.Properties}/${nameOfNodeToMove}`;
    const { move } = setup({
      selectedUniquePointer: uniquePointerOfNodeToMove,
      setSelectedUniquePointer: setSelectedUniquePointerMock,
    });
    const target: ItemPosition = { parentId: uniquePointerOfTargetParent, index: 0 };
    move(uniquePointerOfNodeToMove, target);
    expect(setSelectedUniquePointerMock).toHaveBeenCalledTimes(1);
    expect(setSelectedUniquePointerMock).toHaveBeenCalledWith(expectedFinalUniquePointer);
  });

  it('Does not move the node when it would result in circular references', () => {
    const { move, save } = setup();
    const pointerOfNodeToMove = referenceNodeMock.schemaPointer;
    const pointerOfNewParent = referredNodeMock.schemaPointer;
    const indexInNewParent = 0;
    const target: ItemPosition = { parentId: pointerOfNewParent, index: indexInNewParent };
    jest.spyOn(window, 'alert').mockImplementation(jest.fn());
    move(pointerOfNodeToMove, target);
    expect(save).not.toHaveBeenCalled();
  });
});
