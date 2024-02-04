import type { UiSchemaNodes } from '../../types';
import { mapByKey } from 'app-shared/utils/arrayUtils';

/**
 * Returns all pointers from uiSchema.
 * @param uiSchema The schema nodes of interest.
 * @returns An array of pointers.
 */
export const getPointers = (uiSchema: UiSchemaNodes): string[] => mapByKey(uiSchema, 'pointer');
