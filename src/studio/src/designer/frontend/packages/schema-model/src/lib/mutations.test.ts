import { getGeneralJsonSchemaForTest, validateSchema } from '../../test/testUtils';
import {
  createChildNode,
  insertSchemaNode,
  promotePropertyToType,
  removeItemByPointer,
  renameItemPointer,
} from './mutations';

import { FieldType, Keywords, ObjectKind, ROOT_POINTER } from './types';
import { buildUiSchema } from './build-ui-schema';
import { buildJsonSchema } from './build-json-schema';

const testComplexSchema = getGeneralJsonSchemaForTest('ComplexSchema');
const testSimpleSchema = {
  [Keywords.Properties]: {
    hello: {
      [Keywords.Type]: FieldType.String,
    },
    world: {
      [Keywords.Properties]: {
        hello: {
          [Keywords.Type]: FieldType.Boolean,
        },
      },
    },
  },
};
const worldPointer = [ROOT_POINTER, Keywords.Properties, 'world'].join('/');

test('that we can create nodes', () => {
  const map = buildUiSchema(testComplexSchema);
  map.forEach((parentNode) => {
    const { objectKind, fieldType } = parentNode;

    if (objectKind === ObjectKind.Combination) {
      const newNode = createChildNode(parentNode, 'hello', false);
      expect(newNode).toHaveProperty('objectKind');
    }
    if (fieldType === FieldType.Object) {
      const newNode = createChildNode(parentNode, 'hello', false);
      expect(newNode).toHaveProperty('objectKind');
    }
    if (parentNode.objectKind === ObjectKind.Array) {
      expect(() => {
        createChildNode(parentNode, 'hello', false);
      }).toThrow();
    }
  });
  expect(map).toEqual(buildUiSchema(testComplexSchema));
});

test('that we can rename nodes', () => {
  const uiSchemaNodes = buildUiSchema(testSimpleSchema);

  uiSchemaNodes.forEach((node) => {
    const { pointer } = node;
    if (pointer !== ROOT_POINTER && pointer.includes('hello')) {
      const newPointer = pointer.replace('hello', 'hola');
      const newNodeArray = renameItemPointer(uiSchemaNodes, pointer, newPointer);
      expect(newNodeArray.length).toEqual(uiSchemaNodes.length);
      const converted = buildJsonSchema(newNodeArray);
      expect(JSON.stringify(converted)).toContain('hola');
      expect(validateSchema(converted)).toBeTruthy();
    } else if (pointer !== ROOT_POINTER && pointer.includes('world')) {
      const newPointer = pointer.replace('world', 'monde');
      const newNodeArray = renameItemPointer(uiSchemaNodes, pointer, newPointer);
      expect(newNodeArray.length).toEqual(uiSchemaNodes.length);
      const converted = buildJsonSchema(newNodeArray);
      expect(JSON.stringify(converted)).toContain('monde');
      expect(validateSchema(converted)).toBeTruthy();
    }
  });
  expect(uiSchemaNodes).toEqual(buildUiSchema(testSimpleSchema));
});

test('that we can insert nodes into the node array', () => {
  const uiSchemaNodes = buildUiSchema(testComplexSchema);
  uiSchemaNodes.forEach((uiNode) => {
    const { objectKind, fieldType } = uiNode;
    [true, false].forEach((isDefinition) => {
      if (objectKind === ObjectKind.Combination || fieldType === FieldType.Object) {
        const newNode = createChildNode(uiNode, 'hello', isDefinition);
        const newUiSchema = insertSchemaNode(uiSchemaNodes, newNode);
        const builtJsonSchema = buildJsonSchema(newUiSchema);
        expect(validateSchema(builtJsonSchema)).toBeTruthy();
        expect(newUiSchema.length).toEqual(uiSchemaNodes.length + 1);
      }
    });
  });

  // Should not be mutated
  expect(uiSchemaNodes).toEqual(buildUiSchema(testComplexSchema));
});

test('that we can remove a node by pointer', () => {
  const uiSchemaNodes = buildUiSchema(testSimpleSchema);
  expect(uiSchemaNodes).toEqual(buildUiSchema(testSimpleSchema));

  const changedNodeMap = removeItemByPointer(uiSchemaNodes, worldPointer);
  const jsonSchema = buildJsonSchema(changedNodeMap);

  expect(validateSchema(jsonSchema)).toBeTruthy();
  expect(jsonSchema).toEqual({
    [Keywords.Type]: FieldType.Object,
    [Keywords.Properties]: {
      hello: {
        [Keywords.Type]: FieldType.String,
      },
    },
  });
});

test('that we can promote a node', () => {
  const originalNodeMap = buildUiSchema(testSimpleSchema);
  const promotedNodeMap = promotePropertyToType(originalNodeMap, worldPointer);
  expect(buildJsonSchema(promotedNodeMap)).toEqual({
    [Keywords.Type]: FieldType.Object,
    [Keywords.Properties]: {
      hello: { [Keywords.Type]: FieldType.String },
      world: { [Keywords.Reference]: [ROOT_POINTER, Keywords.Definitions, 'world'].join('/') },
    },
    [Keywords.Definitions]: { world: testSimpleSchema[Keywords.Properties]['world'] },
  });
});
