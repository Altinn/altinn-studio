import type { JsonSchemaNode, UiSchemaNode, UiSchemaNodes } from './types';
import { Keywords, ObjectKind, ROOT_POINTER } from './types';
import JSONPointer from 'jsonpointer';
import { findRequiredProps } from './mappers/required';
import { findJsonFieldType } from './mappers/field-type';
import { getNodeByPointer } from './selectors';
import { sortNodesByChildren } from './mutations/sort-nodes';

export const buildJsonSchema = (uiSchemaNodes: UiSchemaNodes): JsonSchemaNode => {
  const out: JsonSchemaNode = {};
  const rootNode = getNodeByPointer(uiSchemaNodes, ROOT_POINTER);
  Object.assign(out, rootNode.custom);
  if (!rootNode.implicitType) {
    JSONPointer.set(out, '/' + Keywords.Type, rootNode.fieldType);
  }
  JSONPointer.set(out, '/' + Keywords.Required, findRequiredProps(uiSchemaNodes, rootNode.pointer));

  const sortedUiSchemaNodes = sortNodesByChildren(uiSchemaNodes);

  sortedUiSchemaNodes.forEach((uiSchemaNode: UiSchemaNode) => {
    if (uiSchemaNode.pointer === ROOT_POINTER) {
      return;
    }
    const jsonPointer = uiSchemaNode.pointer.replace(ROOT_POINTER, '');
    const startValue = Object.assign({}, uiSchemaNode.custom);
    if (uiSchemaNode.objectKind === ObjectKind.Combination) {
      startValue[uiSchemaNode.fieldType] = [];
    }

    JSONPointer.set(out, jsonPointer, startValue);

    // Resolving and setting reference
    if (typeof uiSchemaNode.ref === 'string') {
      const referedNode = getNodeByPointer(uiSchemaNodes, uiSchemaNode.ref);
      if (!referedNode) {
        throw Error(`Refered uiNode was not found ${uiSchemaNode.ref}`);
      }
      JSONPointer.set(out, [jsonPointer, Keywords.Reference].join('/'), uiSchemaNode.ref);
    }

    // Setting Type for fields
    JSONPointer.set(out, [jsonPointer, Keywords.Type].join('/'), findJsonFieldType(uiSchemaNode));

    // Adding generics back
    [Keywords.Default, Keywords.Const, Keywords.Title, Keywords.Description].forEach((keyword) => {
      JSONPointer.set(out, [jsonPointer, keyword].join('/'), uiSchemaNode[keyword as keyof UiSchemaNode]);
    });

    // Adding enums
    if (uiSchemaNode.enum && uiSchemaNode.enum.length > 0) {
      JSONPointer.set(out, [jsonPointer, Keywords.Enum].join('/'), uiSchemaNode[Keywords.Enum]);
    }

    // Restrictions
    Object.keys(uiSchemaNode.restrictions).forEach((key) =>
      JSONPointer.set(out, [jsonPointer, key].join('/'), uiSchemaNode.restrictions[key]),
    );

    if (uiSchemaNode.children.length > 0 && uiSchemaNode.objectKind === ObjectKind.Field) {
      JSONPointer.set(out, [jsonPointer, Keywords.Properties].join('/'), {});
      // Find required children
      JSONPointer.set(
        out,
        [jsonPointer, Keywords.Required].join('/'),
        findRequiredProps(uiSchemaNodes, uiSchemaNode.pointer),
      );
    }
  });
  return out;
};
