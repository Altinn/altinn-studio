import { renderHookWithProviders } from '../../../../test/renderHookWithProviders';
import { useMoveProperty } from './useMoveProperty';
import type { SchemaEditorAppContextProps } from '../../../contexts/SchemaEditorAppContext';
import type { HandleMove, ItemPosition } from 'app-shared/types/dndTypes';
import {
  extractNameFromPointer,
  ROOT_POINTER,
  SchemaModel,
  validateTestUiSchema,
} from '@altinn/schema-model';
import {
  combinationNodeMock,
  fieldNode1Mock,
  nodeWithSameNameAsObjectChildMock,
  objectChildMock,
  objectNodeMock,
  rootNodeMock,
  toggableNodeMock,
  uiSchemaNodesMock,
} from '../../../../test/mocks/uiSchemaMock';
import type { SavableSchemaModel } from '../../../classes/SavableSchemaModel';
import { ArrayUtils } from '@studio/pure-functions';

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
    return { move, save };
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
    const target: ItemPosition = { parentId: ROOT_POINTER, index: indexInNewParent };
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
    const target: ItemPosition = { parentId: ROOT_POINTER, index: 0 };
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
    const target: ItemPosition = { parentId: ROOT_POINTER, index };
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
    const target: ItemPosition = { parentId: ROOT_POINTER, index };
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

  it('Updates the selected node pointer if moving a node that is selected into an object', () => {
    const setSelectedNodePointerMock = jest.fn();
    const { move, save } = setup({
      selectedUniquePointer: fieldNode1Mock.schemaPointer,
      setSelectedUniquePointer: setSelectedNodePointerMock,
    });
    const pointerOfNodeToMove = fieldNode1Mock.schemaPointer;
    const index = rootNodeMock.children.length;
    const target: ItemPosition = { parentId: ROOT_POINTER, index };
    move(pointerOfNodeToMove, target);
    expect(setSelectedNodePointerMock).toHaveBeenCalledTimes(1);
    const savedModel: SavableSchemaModel = save.mock.lastCall[0];
    const rootChildren = savedModel.getRootChildren();
    const addedRootChild = rootChildren[index];
    expect(setSelectedNodePointerMock).toHaveBeenCalledWith(addedRootChild.schemaPointer);
  });

  it('Updates the selected node pointer if moving a node that is selected into a combination node', () => {
    const setSelectedNodePointerMock = jest.fn();
    const { move } = setup({
      selectedUniquePointer: toggableNodeMock.schemaPointer,
      setSelectedUniquePointer: setSelectedNodePointerMock,
    });
    const pointerOfNodeToMove = toggableNodeMock.schemaPointer;
    const pointerOfNewParent = combinationNodeMock.schemaPointer;
    const indexInNewParent = 0;
    const target: ItemPosition = { parentId: pointerOfNewParent, index: indexInNewParent };
    move(pointerOfNodeToMove, target);
    expect(setSelectedNodePointerMock).toHaveBeenCalledTimes(1);
    expect(setSelectedNodePointerMock).toHaveBeenCalledWith(
      `${combinationNodeMock.schemaPointer}/anyOf/${indexInNewParent}`,
    );
  });
});
