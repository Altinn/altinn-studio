import type { UiSchemaNode, UiSchemaNodes } from '../types';
import {
  ArrRestrictionKey,
  FieldType,
  JsonSchemaType,
  Keyword,
  ObjectKind,
  SpecialArrayXsdField,
} from '../types';
import JSONPointer from 'jsonpointer';
import { findRequiredProps } from './mappers/required';
import { findJsonFieldType } from './mappers/field-type';
import { getRootNode } from './selectors';
import { sortNodesByChildren } from './mutations/sort-nodes';
import { ROOT_POINTER } from './constants';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import { makePointerFromArray } from './pointerUtils';
import { isFieldOrCombination, isReference } from './utils';

export const buildJsonSchema = (nodes: UiSchemaNodes): JsonSchema => {
  const out: JsonSchema = {};
  const rootNode = getRootNode(nodes);
  Object.assign(out, rootNode.custom);
  JSONPointer.set(out, `/${Keyword.Type}`, rootNode.implicitType ? undefined : rootNode.fieldType);
  JSONPointer.set(out, `/${Keyword.Required}`, findRequiredProps(nodes, rootNode.pointer));
  JSONPointer.set(out, `/${Keyword.Description}`, rootNode.description);
  JSONPointer.set(out, `/${Keyword.Title}`, rootNode.title);
  const sortedUiSchemaNodes = sortNodesByChildren(nodes);

  sortedUiSchemaNodes
    .filter((node) => node.pointer !== ROOT_POINTER)
    .forEach((node: UiSchemaNode) => {
      // Arrays need to be dealt with
      const nodePointer = node.pointer.replace(ROOT_POINTER, '');
      const itemsPointer = makePointerFromArray([node.pointer, Keyword.Items]).replace(
        ROOT_POINTER,
        '',
      );
      const jsonPointer = node.isArray ? itemsPointer : nodePointer;
      const customFields = { ...node.custom };

      if (node.isArray) {
        JSONPointer.set(out, nodePointer, {
          [Keyword.Type]: node.isNillable
            ? [JsonSchemaType.Array, FieldType.Null]
            : JsonSchemaType.Array,
        });

        Object.values(ArrRestrictionKey).forEach((key) =>
          JSONPointer.set(out, [nodePointer, key].join('/'), node.restrictions[key]),
        );

        // Putting the special fields back to items root.
        Object.values(SpecialArrayXsdField).forEach((key) => {
          JSONPointer.set(out, [nodePointer, key].join('/'), customFields[key]);
          delete customFields[key];
        });
      }

      const startValue = Object.assign({}, customFields);

      // Adding combination root array to start
      if (node.objectKind === ObjectKind.Combination) {
        startValue[node.combinationType] = [];
      }

      JSONPointer.set(out, jsonPointer, startValue);

      // Setting reference if existing.
      if (isReference(node)) {
        JSONPointer.set(out, [jsonPointer, Keyword.Reference].join('/'), node.reference);
      }

      // Setting Type for fields
      JSONPointer.set(out, [jsonPointer, Keyword.Type].join('/'), findJsonFieldType(node));

      // Adding generics back
      [Keyword.Default, Keyword.Const, Keyword.Title, Keyword.Description].forEach((keyword) => {
        JSONPointer.set(out, [jsonPointer, keyword].join('/'), node[keyword as keyof UiSchemaNode]);
      });

      // Adding enums
      JSONPointer.set(
        out,
        [jsonPointer, Keyword.Enum].join('/'),
        node[Keyword.Enum]?.length ? node[Keyword.Enum] : undefined,
      );

      // Restrictions
      Object.keys(node.restrictions)
        .filter((key) => !Object.keys(ArrRestrictionKey).includes(key))
        .forEach((key) =>
          JSONPointer.set(out, [jsonPointer, key].join('/'), node.restrictions[key]),
        );

      // We are dealing with an object prep the properties and required keywords.
      if (node.objectKind === ObjectKind.Field && node.children.length) {
        JSONPointer.set(out, [jsonPointer, Keyword.Properties].join('/'), {});
        JSONPointer.set(
          out,
          [jsonPointer, Keyword.Required].join('/'),
          findRequiredProps(nodes, node.pointer),
        );
      }
      const currentJsonNode = JSONPointer.get(out, jsonPointer);
      if (
        node.isArray &&
        typeof currentJsonNode === 'object' &&
        Object.keys(currentJsonNode).length === 0 &&
        (!isFieldOrCombination(node) || node.children.length === 0)
      ) {
        JSONPointer.set(out, jsonPointer, undefined);
      }
    });
  return out;
};
