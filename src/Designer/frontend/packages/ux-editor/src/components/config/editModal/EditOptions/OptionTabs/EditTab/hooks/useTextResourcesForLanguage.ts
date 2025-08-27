import { useMemo } from 'react';
import { getTextResourcesForLanguage } from '../utils';
import type { TextResources } from 'libs/studio-content-library/src';

export function useTextResourcesForLanguage(language: string, textResources: TextResources) {
  return useMemo(
    () => getTextResourcesForLanguage(language, textResources),
    [textResources, language],
  );
}
