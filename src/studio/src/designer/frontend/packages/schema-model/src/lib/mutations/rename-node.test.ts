import { buildUiSchema } from '../build-ui-schema';
import { ROOT_POINTER } from '../types';
import { buildJsonSchema } from '../build-json-schema';
import { simpleTestJsonSchema, validateSchema } from '../../../test/testUtils';
import { renameNodePointer } from './rename-node';

test('that we can rename nodes', () => {
  const uiSchemaNodes = buildUiSchema(simpleTestJsonSchema);
  uiSchemaNodes.forEach((node) => {
    const { pointer } = node;
    if (pointer !== ROOT_POINTER && pointer.includes('hello')) {
      const newPointer = pointer.replace('hello', 'hola');
      const newNodeArray = renameNodePointer(uiSchemaNodes, pointer, newPointer);
      expect(newNodeArray.length).toEqual(uiSchemaNodes.length);
      const converted = buildJsonSchema(newNodeArray);
      expect(JSON.stringify(converted)).toContain('hola');
      expect(validateSchema(converted)).toBeTruthy();
    } else if (pointer !== ROOT_POINTER && pointer.includes('world')) {
      const newPointer = pointer.replace('world', 'monde');
      const newNodeArray = renameNodePointer(uiSchemaNodes, pointer, newPointer);
      expect(newNodeArray.length).toEqual(uiSchemaNodes.length);
      const converted = buildJsonSchema(newNodeArray);
      expect(JSON.stringify(converted)).toContain('monde');
      expect(validateSchema(converted)).toBeTruthy();
    }
  });
  expect(uiSchemaNodes).toEqual(buildUiSchema(simpleTestJsonSchema));
});
