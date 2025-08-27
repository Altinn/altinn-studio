import type { TranslationKey } from 'app-shared/types/language';
import { useTranslation } from 'react-i18next';

export type UseText = (key: TranslationKey) => string;

export const useText = (): UseText => useTranslation().t;
