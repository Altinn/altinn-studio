import {
  extractNameFromPointer,
  isReference,
  ReferenceNode,
  SchemaModel,
} from '@altinn/schema-model';
import {
  definitionNodeMock,
  combinationNodeMock,
  uiSchemaNodesMock,
} from '../../../../test/mocks/uiSchemaMock';
import { SchemaEditorAppContextProps } from '../../../contexts/SchemaEditorAppContext';
import { renderHookWithProviders } from '../../../../test/renderHookWithProviders';
import { HandleAdd, ItemPosition } from 'app-shared/types/dndTypes';
import { useAddReference } from './useAddReference';
import { SavableSchemaModel } from '../../../classes/SavableSchemaModel';

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
});
