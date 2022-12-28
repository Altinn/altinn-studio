import { useSelector } from 'react-redux';
import { textSelector } from '../selectors/textSelectors';
import { getLanguageFromKey } from 'app-shared/utils/language';

export const useText = () => {
  const texts = useSelector(textSelector);
  return (key: string) => getLanguageFromKey(key, texts);
}
