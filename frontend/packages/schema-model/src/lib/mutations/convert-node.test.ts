import { buildUiSchema } from '../build-ui-schema';
import { buildJsonSchema } from '../build-json-schema';
import { FieldType, Keywords } from '../types';
import { makePointer } from '../utils';
import { convertPropToType } from './convert-node';
import { simpleTestJsonSchema } from '../../../test/testUtils';
import { convertRefToField } from './convert-node';
import { getNodeByPointer, getNodeIndexByPointer } from '../selectors';

test('that we can convertPropToType', () => {
  const uiSchemaNodes = buildUiSchema(simpleTestJsonSchema);
  const promotedNodeMap = convertPropToType(
    uiSchemaNodes,
    makePointer(Keywords.Properties, 'world')
  );
  expect(buildJsonSchema(promotedNodeMap)).toEqual({
    [Keywords.Properties]: {
      hello: { [Keywords.Type]: FieldType.String },
      world: { [Keywords.Reference]: makePointer(Keywords.Definitions, 'world') },
    },
    [Keywords.Definitions]: { world: simpleTestJsonSchema[Keywords.Properties]['world'] },
  });
});

test('that promotePropertyToType throws errors', () => {
  const uiSchemaNodes = buildUiSchema({
    [Keywords.Properties]: {
      email: { [Keywords.Reference]: makePointer(Keywords.Definitions, 'emailType') },
    },
    [Keywords.Definitions]: {
      emailType: { [Keywords.Type]: FieldType.String },
    },
  });
  expect(() => convertPropToType(uiSchemaNodes, '#/$defs/email')).toThrowError();
  expect(() => convertPropToType(uiSchemaNodes, '#/properties/email')).toThrowError();
});

test('that we can convert a reference to a normal field', () => {
  const uiSchemaNodes = buildUiSchema({
    [Keywords.Properties]: {
      email: { [Keywords.Reference]: makePointer(Keywords.Definitions, 'emailType') },
    },
    [Keywords.Definitions]: {
      emailType: { [Keywords.Type]: FieldType.String },
    },
  });
  const convertedNodes = convertRefToField(
    uiSchemaNodes,
    makePointer(Keywords.Properties, 'email')
  );
  expect(uiSchemaNodes).not.toBe(convertedNodes);
  expect(buildJsonSchema(convertedNodes)).toStrictEqual({
    [Keywords.Properties]: {
      email: { [Keywords.Type]: FieldType.String },
    },
  });
});

test('that we can convert a reference that is referred more than once', () => {
  const uiSchemaNodes = buildUiSchema({
    [Keywords.Properties]: {
      email: { [Keywords.Reference]: makePointer(Keywords.Definitions, 'emailType') },
      otherEmail: { [Keywords.Reference]: makePointer(Keywords.Definitions, 'emailType') },
    },
    [Keywords.Definitions]: {
      emailType: { [Keywords.Type]: FieldType.String },
    },
  });
  const convertedNodes = convertRefToField(
    uiSchemaNodes,
    makePointer(Keywords.Properties, 'email')
  );
  expect(uiSchemaNodes).not.toBe(convertedNodes);
  expect(buildJsonSchema(convertedNodes)).toStrictEqual({
    [Keywords.Properties]: {
      email: { [Keywords.Type]: FieldType.String },
      otherEmail: { [Keywords.Reference]: makePointer(Keywords.Definitions, 'emailType') },
    },
    [Keywords.Definitions]: {
      emailType: { [Keywords.Type]: FieldType.String },
    },
  });
});

test('that it can convert a reference with children to a normal field', () => {
  const uiSchemaNodes = buildUiSchema({
    [Keywords.Properties]: {
      email: { [Keywords.Reference]: makePointer(Keywords.Definitions, 'emailType') },
    },
    [Keywords.Definitions]: {
      emailType: {
        [Keywords.Type]: FieldType.Object,
        [Keywords.Properties]: {
          givenName: FieldType.String,
          familyName: FieldType.String,
        },
      },
    },
  });
  const pointerThatShouldBeConverted = makePointer(Keywords.Properties, 'email');
  const convertedNodes = convertRefToField(uiSchemaNodes, pointerThatShouldBeConverted);
  const targetNode = getNodeByPointer(convertedNodes, pointerThatShouldBeConverted);
  expect(targetNode.children).toHaveLength(2);
  targetNode.children.forEach((childPointer) =>
    expect(getNodeIndexByPointer(convertedNodes, childPointer)).toBeDefined()
  );
});
