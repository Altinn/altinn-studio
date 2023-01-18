import { useSelector } from 'react-redux';
import { textSelector } from '../selectors/textSelectors';
import { getLanguageFromKey } from 'app-shared/utils/language';

export type UseText = (key: string) => string;
export const useText = (): UseText => {
  const texts = useSelector(textSelector);
  return (key: string) => getLanguageFromKey(key, texts);
};
