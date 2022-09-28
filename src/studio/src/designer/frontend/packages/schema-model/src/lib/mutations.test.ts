import { dumpToDebug, getGeneralJsonSchemaForTest, validateSchema } from '../../test/testUtils';
import {
  createChildNode,
  insertNodeToMap,
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
  const map = buildUiSchema(testSimpleSchema);

  map.forEach((node) => {
    const { pointer } = node;
    if (pointer !== ROOT_POINTER && pointer.includes('hello')) {
      const newPointer = pointer.replace('hello', 'hola');
      const newNodeMap = renameItemPointer(map, pointer, newPointer);
      expect(newNodeMap.size).toEqual(map.size);
      const converted = buildJsonSchema(newNodeMap);
      expect(JSON.stringify(converted)).toContain('hola');
      expect(validateSchema(converted)).toBeTruthy();
    } else if (pointer !== ROOT_POINTER && pointer.includes('world')) {
      const newPointer = pointer.replace('world', 'monde');
      const newNodeMap = renameItemPointer(map, pointer, newPointer);
      expect(newNodeMap.size).toEqual(map.size);
      const converted = buildJsonSchema(newNodeMap);
      expect(JSON.stringify(converted)).toContain('monde');
      expect(validateSchema(converted)).toBeTruthy();
    }
  });
  expect(map).toEqual(buildUiSchema(testSimpleSchema));
});

test('that we can insert nodes into the map', () => {
  const originalNodeMap = buildUiSchema(testComplexSchema);
  dumpToDebug(__dirname, 'orginal', originalNodeMap);
  originalNodeMap.forEach((uiNode) => {
    const { objectKind, fieldType } = uiNode;
    [true, false].forEach((isDefinition) => {
      if (objectKind === ObjectKind.Combination || fieldType === FieldType.Object) {
        const newNode = createChildNode(uiNode, 'hello', isDefinition);
        const newUiSchema = insertNodeToMap(originalNodeMap, newNode);
        expect(validateSchema(buildJsonSchema(newUiSchema))).toBeTruthy();
        expect(newUiSchema.size).toEqual(originalNodeMap.size + 1);
      }
    });
  });

  // Should not be mutated
  expect(originalNodeMap).toEqual(buildUiSchema(testComplexSchema));
});

test('that we can remove a node by pointer', () => {
  const originalNodeMap = buildUiSchema(testSimpleSchema);
  const changedNodeMap = removeItemByPointer(originalNodeMap, '#/properties/world');
  const jsonSchema = buildJsonSchema(changedNodeMap);
  expect(originalNodeMap).toEqual(buildUiSchema(testSimpleSchema));
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
