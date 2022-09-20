import { JsonSchemaNode, Keywords, ROOT_POINTER, UiSchemaMap, UiSchemaNode } from './types';
import { createPointerLookupTable } from './utils';
import JSONPointer from 'jsonpointer';
import { findRequiredProps } from './handlers/required';
import { ObjectKind } from '../types/enums';
import { getJsonFieldType } from './handlers/field-type';
import { genericKeywords } from './handlers/generic';

export const buildJsonSchema = (uiNodeMap: UiSchemaMap): JsonSchemaNode => {
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
        findRequiredProps(uiNodeMap, uiSchemaNode.nodeId),
      );
    } else {
      allPointers.push(uiSchemaNode.pointer);
    }
  });

  allPointers.sort();
  allPointers.forEach((sortedPointer: string) => {
    const uiSchemaNode = uiNodeMap.get(lookup.get(sortedPointer) as number) as UiSchemaNode;
    const pointer = uiSchemaNode.pointer.replace(ROOT_POINTER, '');
    const startValue = Object.assign({}, uiSchemaNode.custom);
    if (uiSchemaNode.objectKind === ObjectKind.Combination) {
      startValue[uiSchemaNode.fieldType] = [];
    }

    JSONPointer.set(out, pointer, startValue);

    // Resolving and setting reference
    if (typeof uiSchemaNode.ref === 'number') {
      const reference = uiNodeMap.get(uiSchemaNode.ref);
      JSONPointer.set(out, [pointer, Keywords.Reference].join('/'), reference?.pointer);
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
        findRequiredProps(uiNodeMap, uiSchemaNode.nodeId),
      );
    }
  });
  return out;
};
