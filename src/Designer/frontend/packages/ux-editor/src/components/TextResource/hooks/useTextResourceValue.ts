import { useTextResourcesSelector } from 'app-shared/hooks';
import { textResourceByLanguageAndIdSelector } from 'app-shared/selectors/textResourceSelectors';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';

export const useTextResourceValue = (id: string) => {
  const selector = textResourceByLanguageAndIdSelector(DEFAULT_LANGUAGE, id);
  return useTextResourcesSelector(selector)?.value;
};
