import { useTextResourcesSelector } from '@altinn/ux-editor/hooks';
import { textResourceByLanguageAndIdSelector } from '@altinn/ux-editor/selectors/textResourceSelectors';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';

export const useTextResourceValue = (id: string) => {
  const selector = textResourceByLanguageAndIdSelector(DEFAULT_LANGUAGE, id);
  return useTextResourcesSelector(selector)?.value;
};
