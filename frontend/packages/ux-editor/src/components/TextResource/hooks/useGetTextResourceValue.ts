import { useTextResourcesSelector } from '@altinn/ux-editor/hooks';
import { textResourceByLanguageAndIdSelector } from '@altinn/ux-editor/selectors/textResourceSelectors';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';

export const useGetTextResourceValue = (id: string) => {
  const selector = textResourceByLanguageAndIdSelector(DEFAULT_LANGUAGE, id);
  const value = useTextResourcesSelector(selector)?.value;
  return value;
};
