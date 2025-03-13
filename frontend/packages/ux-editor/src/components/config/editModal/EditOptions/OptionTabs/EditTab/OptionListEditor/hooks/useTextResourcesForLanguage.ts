import { useMemo } from 'react';
import { getTextResourcesForLanguage } from '../utils/utils';
import type { TextResources } from '@studio/content-library';

export function useTextResourcesForLanguage(language: string, textResources: TextResources) {
  return useMemo(
    () => getTextResourcesForLanguage(language, textResources),
    [textResources, language],
  );
}
