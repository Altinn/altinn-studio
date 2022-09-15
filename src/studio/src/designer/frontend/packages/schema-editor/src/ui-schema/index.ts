import { createUiNode } from './create-ui-node';
import { JsonSchemaNode, Keywords, ROOT_POINTER, UiSchemaNode } from './types';
import { createNodeBase, createPointerLookupTable } from './utils';
import JSONPointer from 'jsonpointer';
import { findRequiredProps } from './handlers/required';
import { ObjectKind } from '../types/enums';
import { getJsonFieldType } from './handlers/field-type';
import { genericKeywords } from './handlers/generic';

export const toUiSchema = (jsonSchema: JsonSchemaNode): Map<string, UiSchemaNode> => {
  const map = createUiNode(jsonSchema, createNodeBase(ROOT_POINTER));

  // Just resolve references when we are dealing with the root, all items is resolved at this point.
  const lookup = createPointerLookupTable(map);
  map.forEach((item) => {
    if (item.ref) {
      item.ref = lookup.get(item.ref);
    }
  });
  return map;
};

export const toJsonSchema = (uiNodeMap: Map<string, UiSchemaNode>): JsonSchemaNode => {
  const allPointers: string[] = [];
  const out: JsonSchemaNode = {};
  const lookup = createPointerLookupTable(uiNodeMap);
  uiNodeMap.forEach((uiSchemaNode) => {
    if (uiSchemaNode.pointer === ROOT_POINTER) {
      Object.assign(out, uiSchemaNode.custom);
      JSONPointer.set(out, '/' + Keywords.Type, uiSchemaNode.fieldType);
      JSONPointer.set(
        out,
        '/' + Keywords.Required,
        findRequiredProps(uiSchemaNode.nodeId, uiNodeMap),
      );
    } else {
      allPointers.push(uiSchemaNode.pointer);
    }
  });

  allPointers.sort();
  allPointers.forEach((sortedPointer: string) => {
    const uiSchemaNode = uiNodeMap.get(lookup.get(sortedPointer) as string) as UiSchemaNode;
    const pointer = uiSchemaNode.pointer.replace(ROOT_POINTER, '');
    const startValue = Object.assign({}, uiSchemaNode.custom);
    if (uiSchemaNode.objectKind === ObjectKind.Combination) {
      startValue[uiSchemaNode.fieldType] = [];
    }

    JSONPointer.set(out, pointer, startValue);

    // Resolving and setting reference
    if (uiSchemaNode.ref !== undefined) {
      const reference = uiNodeMap.get(uiSchemaNode.ref) as UiSchemaNode;
      JSONPointer.set(out, [pointer, Keywords.Reference].join('/'), reference.pointer);
    }

    // Setting Type for fields
    JSONPointer.set(out, [pointer, Keywords.Type].join('/'), getJsonFieldType(uiSchemaNode));

    // Adding generics back
    genericKeywords.forEach((keyword) => {
      JSONPointer.set(
        out,
        [pointer, keyword].join('/'),
        uiSchemaNode[keyword as keyof UiSchemaNode],
      );
    });

    // Restrictions
    Object.keys(uiSchemaNode.restrictions).forEach((key) =>
      JSONPointer.set(out, [pointer, key].join('/'), uiSchemaNode.restrictions[key]),
    );

    if (uiSchemaNode.children.length > 0 && uiSchemaNode.objectKind === ObjectKind.Field) {
      JSONPointer.set(out, [pointer, Keywords.Properties].join('/'), {});
      // Find required children
      JSONPointer.set(
        out,
        [pointer, Keywords.Required].join('/'),
        findRequiredProps(uiSchemaNode.nodeId, uiNodeMap),
      );
    }
  });
  return out;
};
