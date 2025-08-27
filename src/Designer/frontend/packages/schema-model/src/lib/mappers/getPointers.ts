import type { UiSchemaNodes } from '../../types';
import { ArrayUtils } from '@studio/pure-functions';

/**
 * Returns all pointers from uiSchema.
 * @param uiSchema The schema nodes of interest.
 * @returns An array of pointers.
 */
export const getPointers = (uiSchema: UiSchemaNodes): string[] =>
  ArrayUtils.mapByKey(uiSchema, 'schemaPointer');
