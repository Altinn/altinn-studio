import { UiSchemaItem } from '../types';
import { ObjectKind } from '@altinn/schema-model';

export function getObjectKind(item?: UiSchemaItem): ObjectKind {
  if (item?.$ref !== undefined || item?.items?.$ref !== undefined) {
    return ObjectKind.Reference;
  } else if (item?.combination) {
    return ObjectKind.Combination;
  } else {
    return ObjectKind.Field;
  }
}
