import {
  extractNameFromPointer,
  isReference,
  ReferenceNode,
  SchemaModel,
} from '../../../../../schema-model';
import {
  definitionNodeMock,
  parentNodeMock,
  uiSchemaNodesMock
} from '../../../../test/mocks/uiSchemaMock';
import {SchemaEditorAppContextProps} from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import {renderHookWithProviders} from '../../../../test/renderHookWithProviders';
import {HandleAdd, ItemPosition} from 'app-shared/types/dndTypes';
import {useAddReference} from '@altinn/schema-editor/components/SchemaEditor/hooks/useAddReference';

describe('useAddReference', () => {
  const setup = () => {
    const save = jest.fn();
    const schemaModel = SchemaModel.fromArray(uiSchemaNodesMock).deepClone();
    const appContextProps: Partial<SchemaEditorAppContextProps> = { schemaModel, save };
    const { result } = renderHookWithProviders({ appContextProps })(useAddReference);
    const add: HandleAdd<string> = result.current;
    return { add, schemaModel, save };
  };

  it('Adds a reference to the given position', () => {
    const { add, schemaModel, save } = setup();
    const nameOfDefinition = extractNameFromPointer(definitionNodeMock.pointer);
    const pointerOfParent = parentNodeMock.pointer;
    const indexInNewParent = 1;
    const target: ItemPosition = { parentId: pointerOfParent, index: indexInNewParent };
    add(nameOfDefinition, target);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(schemaModel);
    const childrenOfNewParent = schemaModel.getChildNodes(pointerOfParent);
    const addedChild = childrenOfNewParent[indexInNewParent];
    expect(isReference(addedChild)).toBe(true);
    const addedReferenceNode = addedChild as ReferenceNode;
    expect(addedReferenceNode.reference).toEqual(definitionNodeMock.pointer);
  });
});
