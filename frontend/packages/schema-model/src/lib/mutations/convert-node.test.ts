import { buildUiSchema } from '../build-ui-schema';
import { buildJsonSchema } from '../build-json-schema';
import { FieldType, Keyword } from '../../types';
import { makePointer } from '../utils';
import { convertPropToType } from './convert-node';
import { simpleTestJsonSchema } from '../../../test/testUtils';
import { convertRefToField } from './convert-node';
import { getNodeByPointer, getNodeIndexByPointer } from '../selectors';

test('that we can convertPropToType', () => {
  const uiSchemaNodes = buildUiSchema(simpleTestJsonSchema);
  const promotedNodeMap = convertPropToType(
    uiSchemaNodes,
    makePointer(Keyword.Properties, 'world')
  );
  expect(buildJsonSchema(promotedNodeMap)).toEqual({
    [Keyword.Properties]: {
      hello: { [Keyword.Type]: FieldType.String },
      world: { [Keyword.Reference]: makePointer(Keyword.Definitions, 'world') },
    },
    [Keyword.Definitions]: { world: simpleTestJsonSchema[Keyword.Properties]['world'] },
  });
});

test('that promotePropertyToType throws errors', () => {
  const uiSchemaNodes = buildUiSchema({
    [Keyword.Properties]: {
      email: { [Keyword.Reference]: makePointer(Keyword.Definitions, 'emailType') },
    },
    [Keyword.Definitions]: {
      emailType: { [Keyword.Type]: FieldType.String },
    },
  });
  expect(() => convertPropToType(uiSchemaNodes, '#/$defs/email')).toThrowError();
  expect(() => convertPropToType(uiSchemaNodes, '#/properties/email')).toThrowError();
});

test('that we can convert a reference to a normal field', () => {
  const uiSchemaNodes = buildUiSchema({
    [Keyword.Properties]: {
      email: { [Keyword.Reference]: makePointer(Keyword.Definitions, 'emailType') },
    },
    [Keyword.Definitions]: {
      emailType: { [Keyword.Type]: FieldType.String },
    },
  });
  const convertedNodes = convertRefToField(
    uiSchemaNodes,
    makePointer(Keyword.Properties, 'email')
  );
  expect(uiSchemaNodes).not.toBe(convertedNodes);
  expect(buildJsonSchema(convertedNodes)).toStrictEqual({
    [Keyword.Properties]: {
      email: { [Keyword.Type]: FieldType.String },
    },
  });
});

test('that we can convert a reference that is referred more than once', () => {
  const uiSchemaNodes = buildUiSchema({
    [Keyword.Properties]: {
      email: { [Keyword.Reference]: makePointer(Keyword.Definitions, 'emailType') },
      otherEmail: { [Keyword.Reference]: makePointer(Keyword.Definitions, 'emailType') },
    },
    [Keyword.Definitions]: {
      emailType: { [Keyword.Type]: FieldType.String },
    },
  });
  const convertedNodes = convertRefToField(
    uiSchemaNodes,
    makePointer(Keyword.Properties, 'email')
  );
  expect(uiSchemaNodes).not.toBe(convertedNodes);
  expect(buildJsonSchema(convertedNodes)).toStrictEqual({
    [Keyword.Properties]: {
      email: { [Keyword.Type]: FieldType.String },
      otherEmail: { [Keyword.Reference]: makePointer(Keyword.Definitions, 'emailType') },
    },
    [Keyword.Definitions]: {
      emailType: { [Keyword.Type]: FieldType.String },
    },
  });
});

test('that it can convert a reference with children to a normal field', () => {
  const uiSchemaNodes = buildUiSchema({
    [Keyword.Properties]: {
      email: { [Keyword.Reference]: makePointer(Keyword.Definitions, 'emailType') },
    },
    [Keyword.Definitions]: {
      emailType: {
        [Keyword.Type]: FieldType.Object,
        [Keyword.Properties]: {
          givenName: FieldType.String,
          familyName: FieldType.String,
        },
      },
    },
  });
  const pointerThatShouldBeConverted = makePointer(Keyword.Properties, 'email');
  const convertedNodes = convertRefToField(uiSchemaNodes, pointerThatShouldBeConverted);
  const targetNode = getNodeByPointer(convertedNodes, pointerThatShouldBeConverted);
  expect(targetNode.children).toHaveLength(2);
  targetNode.children.forEach((childPointer) =>
    expect(getNodeIndexByPointer(convertedNodes, childPointer)).toBeDefined()
  );
});
