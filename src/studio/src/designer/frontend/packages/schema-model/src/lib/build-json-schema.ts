import type { Dict, UiSchemaNode, UiSchemaNodes } from './types';
import { FieldType, JsonSchemaType, Keywords, ObjectKind } from './types';
import JSONPointer from 'jsonpointer';
import { findRequiredProps } from './mappers/required';
import { findJsonFieldType } from './mappers/field-type';
import { getRootNode } from './selectors';
import { sortNodesByChildren } from './mutations/sort-nodes';
import { ROOT_POINTER } from './constants';
import { makePointer } from './utils';
import { ArrRestrictionKeys } from './restrictions';

export const buildJsonSchema = (nodes: UiSchemaNodes): Dict => {
  const out: Dict = {};
  const rootNode = getRootNode(nodes);
  Object.assign(out, rootNode.custom);
  JSONPointer.set(out, '/' + Keywords.Type, !rootNode.implicitType ? rootNode.fieldType : undefined);
  JSONPointer.set(out, '/' + Keywords.Required, findRequiredProps(nodes, rootNode.pointer));

  const sortedUiSchemaNodes = sortNodesByChildren(nodes);

  sortedUiSchemaNodes
    .filter((node) => node.pointer !== ROOT_POINTER)
    .forEach((node: UiSchemaNode) => {
      // Arrays need to be dealed with
      const nodePointer = node.pointer.replace(ROOT_POINTER, '');
      const itemsPointer = makePointer(node.pointer, Keywords.Items).replace(ROOT_POINTER, '');
      const jsonPointer = node.isArray ? itemsPointer : nodePointer;

      if (node.isArray) {
        JSONPointer.set(out, nodePointer, {
          [Keywords.Type]: node.isNillable ? [JsonSchemaType.Array, FieldType.Null] : JsonSchemaType.Array,
        });

        Object.keys(ArrRestrictionKeys).forEach((key) =>
          JSONPointer.set(out, [nodePointer, key].join('/'), node.restrictions[key]),
        );
      }

      const startValue = Object.assign({}, node.custom);

      // Adding combination root array to start
      if (node.objectKind === ObjectKind.Combination) {
        startValue[node.fieldType] = [];
      }

      JSONPointer.set(out, jsonPointer, startValue);

      // Setting reference if existing.
      JSONPointer.set(
        out,
        [jsonPointer, Keywords.Reference].join('/'),
        typeof node.ref === 'string' ? node.ref : undefined,
      );

      // Setting Type for fields
      JSONPointer.set(out, [jsonPointer, Keywords.Type].join('/'), findJsonFieldType(node));

      // Adding generics back
      [Keywords.Default, Keywords.Const, Keywords.Title, Keywords.Description].forEach((keyword) => {
        JSONPointer.set(out, [jsonPointer, keyword].join('/'), node[keyword as keyof UiSchemaNode]);
      });

      // Adding enums
      JSONPointer.set(
        out,
        [jsonPointer, Keywords.Enum].join('/'),
        node[Keywords.Enum]?.length ? node[Keywords.Enum] : undefined,
      );

      // Restrictions
      Object.keys(node.restrictions)
        .filter((key) => !Object.keys(ArrRestrictionKeys).includes(key))
        .forEach((key) => JSONPointer.set(out, [jsonPointer, key].join('/'), node.restrictions[key]));

      // We are dealing with an object prep the properties and required keywords.
      if (node.children.length && node.objectKind === ObjectKind.Field) {
        JSONPointer.set(out, [jsonPointer, Keywords.Properties].join('/'), {});
        JSONPointer.set(out, [jsonPointer, Keywords.Required].join('/'), findRequiredProps(nodes, node.pointer));
      }
      const currentJsonNode = JSONPointer.get(out, jsonPointer);
      if (
        node.isArray &&
        typeof currentJsonNode === 'object' &&
        Object.keys(currentJsonNode).length === 0 &&
        node.children.length === 0
      ) {
        JSONPointer.set(out, jsonPointer, undefined);
      }
    });
  return out;
};
