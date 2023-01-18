import { useSelector } from 'react-redux';
import { textSelector } from '../selectors/textSelectors';
import { getLanguageFromKey } from 'app-shared/utils/language';

export interface UseTextResult {
  (key: string): string;
}
export const useText = (): UseTextResult => {
  const texts = useSelector(textSelector);
  return (key: string) => getLanguageFromKey(key, texts);
};
