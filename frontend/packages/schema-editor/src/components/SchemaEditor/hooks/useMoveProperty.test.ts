import { renderHookWithProviders } from '../../../../test/renderHookWithProviders';
import { useMoveProperty } from '@altinn/schema-editor/components/SchemaEditor/hooks/useMoveProperty';
import { SchemaEditorAppContextProps } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { HandleMove, ItemPosition } from 'app-shared/types/dndTypes';
import {
  extractNameFromPointer,
  ROOT_POINTER,
  SchemaModel,
  validateTestUiSchema,
} from '../../../../../schema-model';
import {
  fieldNode1Mock,
  secondParentNodeMock,
  uiSchemaNodesMock,
} from '../../../../test/mocks/uiSchemaMock';

describe('useMoveProperty', () => {

  const setup = () => {
    const save = jest.fn();
    const schemaModel = SchemaModel.fromArray(uiSchemaNodesMock).deepClone();
    const appContextProps: Partial<SchemaEditorAppContextProps> = { schemaModel, save };
    const { result } = renderHookWithProviders({ appContextProps })(useMoveProperty);
    const move: HandleMove = result.current;
    return { move, schemaModel, save };
  };

  it('Moves a property to the given position', () => {
    const { move, schemaModel, save } = setup();
    const pointerOfNodeToMove = fieldNode1Mock.pointer;
    const pointerOfNewParent = secondParentNodeMock.pointer;
    const indexInNewParent = 1;
    const target: ItemPosition = { parentId: pointerOfNewParent, index: indexInNewParent };
    move(pointerOfNodeToMove, target);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(schemaModel);
    const childrenOfNewParent = schemaModel.getChildNodes(pointerOfNewParent);
    const addedChild = childrenOfNewParent[indexInNewParent];
    const nameOfMovedNode = extractNameFromPointer(pointerOfNodeToMove);
    const nameOfAddedChild = extractNameFromPointer(addedChild.pointer);
    expect(nameOfAddedChild).toEqual(nameOfMovedNode);
    validateTestUiSchema(schemaModel.asArray());
  });

  it('Moves a property to the given position when it is the root', () => {
    const { move, schemaModel, save } = setup();
    const pointerOfNodeToMove = fieldNode1Mock.pointer;
    const indexInNewParent = 1;
    const target: ItemPosition = { parentId: ROOT_POINTER, index: indexInNewParent };
    move(pointerOfNodeToMove, target);
    expect(save).toHaveBeenCalledTimes(1);
    const rootChildren = schemaModel.getRootChildren();
    const addedRootChild = rootChildren[indexInNewParent];
    const nameOfMovedNode = extractNameFromPointer(pointerOfNodeToMove);
    const nameOfAddedChild = extractNameFromPointer(addedRootChild.pointer);
    expect(nameOfAddedChild).toEqual(nameOfMovedNode);
    validateTestUiSchema(schemaModel.asArray());
  });

  it('Moves a property to the given position when it is the root and the target index is 0', () => {
    const { move, schemaModel, save } = setup();
    const pointerOfNodeToMove = fieldNode1Mock.pointer;
    const target: ItemPosition = { parentId: ROOT_POINTER, index: 0 };
    move(pointerOfNodeToMove, target);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(schemaModel);
    const rootChildren = schemaModel.getRootChildren();
    const addedRootChild = rootChildren[0];
    const nameOfMovedNode = extractNameFromPointer(pointerOfNodeToMove);
    const nameOfAddedChild = extractNameFromPointer(addedRootChild.pointer);
    expect(nameOfAddedChild).toEqual(nameOfMovedNode);
    validateTestUiSchema(schemaModel.asArray());
  });
});
