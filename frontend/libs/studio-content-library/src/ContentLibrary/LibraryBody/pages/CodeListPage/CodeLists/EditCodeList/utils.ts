import type { TextResource } from '../../../../../../types/TextResource';
import type { TextResources } from '../../../../../../types/TextResources';
import type { TextResourceWithLanguage } from '../../../../../../types/TextResourceWithLanguage';

export const getTextResourcesForLanguage = (
  language: string,
  textResources?: TextResources,
): TextResource[] | undefined => textResources?.[language];

export const createTextResourceWithLanguage = (
  language: string,
  textResource: TextResource,
): TextResourceWithLanguage => ({ language, textResource });
