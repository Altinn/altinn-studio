import {
  JsonSchemaNode,
  Keywords,
  ObjectKind,
  ROOT_POINTER,
  UiSchemaMap,
  UiSchemaNode,
} from './types';
import JSONPointer from 'jsonpointer';
import { findRequiredProps } from './handlers/required';
import { getJsonFieldType } from './handlers/field-type';
import { genericKeywords } from './handlers/generic';

export const buildJsonSchema = (uiNodeMap: UiSchemaMap): JsonSchemaNode => {
  const allPointers: string[] = [];
  const out: JsonSchemaNode = {};

  // First iterate to crate the basic
  uiNodeMap.forEach((uiSchemaNode, uiNodePointer) => {
    if (uiNodePointer === ROOT_POINTER) {
      Object.assign(out, uiSchemaNode.custom);
      JSONPointer.set(out, '/' + Keywords.Type, uiSchemaNode.fieldType);
      JSONPointer.set(out, '/' + Keywords.Required, findRequiredProps(uiNodeMap, uiNodePointer));
    } else {
      allPointers.push(uiNodePointer);
    }
  });

  allPointers.sort();
  allPointers.forEach((sortedPointer: string) => {
    const uiSchemaNode = uiNodeMap.get(sortedPointer);
    const jsonPointer = uiSchemaNode.pointer.replace(ROOT_POINTER, '');
    const startValue = Object.assign({}, uiSchemaNode.custom);
    if (uiSchemaNode.objectKind === ObjectKind.Combination) {
      startValue[uiSchemaNode.fieldType] = [];
    }

    JSONPointer.set(out, jsonPointer, startValue);

    // Resolving and setting reference
    if (typeof uiSchemaNode.ref === 'string') {
      if (!uiNodeMap.has(uiSchemaNode.ref)) {
        throw Error(`Refered uiNode was not found ${uiSchemaNode.ref}`);
      }
      JSONPointer.set(out, [jsonPointer, Keywords.Reference].join('/'), uiSchemaNode.ref);
    }

    // Setting Type for fields
    JSONPointer.set(out, [jsonPointer, Keywords.Type].join('/'), getJsonFieldType(uiSchemaNode));

    // Adding generics back
    genericKeywords.forEach((keyword) => {
      JSONPointer.set(
        out,
        [jsonPointer, keyword].join('/'),
        uiSchemaNode[keyword as keyof UiSchemaNode],
      );
    });

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
        findRequiredProps(uiNodeMap, uiSchemaNode.pointer),
      );
    }
  });
  return out;
};
