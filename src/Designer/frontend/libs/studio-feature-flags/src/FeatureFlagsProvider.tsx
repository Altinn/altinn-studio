import React, { useState } from 'react';
import type { FeatureFlag } from './FeatureFlag';
import { retrieveFeatureFlags } from './utils';
import { FeatureFlagsContextProvider } from './FeatureFlagsContext';

export type FeatureFlagsProviderProps = { children: React.ReactNode };

export function FeatureFlagsProvider({ children }: FeatureFlagsProviderProps): React.ReactElement {
  const [flags] = useState<FeatureFlag[]>(retrieveFeatureFlags());
  return <FeatureFlagsContextProvider value={{ flags }}>{children}</FeatureFlagsContextProvider>;
}
