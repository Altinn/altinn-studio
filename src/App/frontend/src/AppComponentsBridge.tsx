import React from 'react';
import type { PropsWithChildren } from 'react';

import { AppComponentsProvider } from 'src/app-components/AppComponentsProvider';
import { useLanguage } from 'src/features/language/useLanguage';

export function AppComponentsBridge({ children }: PropsWithChildren) {
  const { langAsString } = useLanguage();

  return <AppComponentsProvider t={langAsString}>{children}</AppComponentsProvider>;
}
