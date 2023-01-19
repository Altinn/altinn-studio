import { useSelector } from 'react-redux';
import { textSelector } from '../selectors/textSelectors';
import { getLanguageFromKey } from 'app-shared/utils/language';
import type { TranslationKey } from 'app-shared/types/language';

export type UseText = (key: TranslationKey) => string;

export const useText = (): UseText => {
  const texts = useSelector(textSelector);
  return (key: TranslationKey) => getLanguageFromKey(key, texts);
};
