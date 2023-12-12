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
import { SavableSchemaModel } from '@altinn/schema-editor/classes/SavableSchemaModel';

describe('useMoveProperty', () => {

  const setup = () => {
    const save = jest.fn();
    const schemaModel = SchemaModel.fromArray(uiSchemaNodesMock).deepClone();
    const appContextProps: Partial<SchemaEditorAppContextProps> = { schemaModel, save };
    const { result } = renderHookWithProviders({ appContextProps })(useMoveProperty);
    const move: HandleMove = result.current;
    return { move, save };
  };

  it('Moves a property to the given position', () => {
    const { move, save } = setup();
    const pointerOfNodeToMove = fieldNode1Mock.pointer;
    const pointerOfNewParent = secondParentNodeMock.pointer;
    const indexInNewParent = 1;
    const target: ItemPosition = { parentId: pointerOfNewParent, index: indexInNewParent };
    move(pointerOfNodeToMove, target);
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel: SavableSchemaModel = save.mock.lastCall[0];
    const childrenOfNewParent = savedModel.getChildNodes(pointerOfNewParent);
    const addedChild = childrenOfNewParent[indexInNewParent];
    const nameOfMovedNode = extractNameFromPointer(pointerOfNodeToMove);
    const nameOfAddedChild = extractNameFromPointer(addedChild.pointer);
    expect(nameOfAddedChild).toEqual(nameOfMovedNode);
    validateTestUiSchema(savedModel.asArray());
  });

  it('Moves a property to the given position when it is the root', () => {
    const { move, save } = setup();
    const pointerOfNodeToMove = fieldNode1Mock.pointer;
    const indexInNewParent = 1;
    const target: ItemPosition = { parentId: ROOT_POINTER, index: indexInNewParent };
    move(pointerOfNodeToMove, target);
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel: SavableSchemaModel = save.mock.lastCall[0];
    const rootChildren = savedModel.getRootChildren();
    const addedRootChild = rootChildren[indexInNewParent];
    const nameOfMovedNode = extractNameFromPointer(pointerOfNodeToMove);
    const nameOfAddedChild = extractNameFromPointer(addedRootChild.pointer);
    expect(nameOfAddedChild).toEqual(nameOfMovedNode);
    validateTestUiSchema(savedModel.asArray());
  });

  it('Moves a property to the given position when it is the root and the target index is 0', () => {
    const { move, save } = setup();
    const pointerOfNodeToMove = fieldNode1Mock.pointer;
    const target: ItemPosition = { parentId: ROOT_POINTER, index: 0 };
    move(pointerOfNodeToMove, target);
    expect(save).toHaveBeenCalledTimes(1);
    const savedModel: SavableSchemaModel = save.mock.lastCall[0];
    const rootChildren = savedModel.getRootChildren();
    const addedRootChild = rootChildren[0];
    const nameOfMovedNode = extractNameFromPointer(pointerOfNodeToMove);
    const nameOfAddedChild = extractNameFromPointer(addedRootChild.pointer);
    expect(nameOfAddedChild).toEqual(nameOfMovedNode);
    validateTestUiSchema(savedModel.asArray());
  });
});
