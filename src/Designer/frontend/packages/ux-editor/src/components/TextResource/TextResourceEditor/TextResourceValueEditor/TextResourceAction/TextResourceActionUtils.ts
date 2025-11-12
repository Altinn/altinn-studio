import { generateRandomId } from '../../../../../../../shared/src/utils/generateRandomId';
import { generateTextResourceId } from '../../../../../utils/generateId';
import type { GenerateTextResourceIdOptions } from '../../../TextResource';

export const generateId = (options?: GenerateTextResourceIdOptions) => {
  if (!options) {
    return '';
  }
  return generateTextResourceId({
    layoutId: options.layoutId,
    componentId: options.componentId,
    textKey: options.textResourceKey,
    suffix: generateRandomId(4),
  });
};
