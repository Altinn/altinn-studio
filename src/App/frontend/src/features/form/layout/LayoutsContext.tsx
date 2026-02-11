import type { PropsWithChildren } from 'react';

import { getLayoutSets } from 'src/features/form/layoutSets';
import type { ILayouts } from 'src/layout/layout';

export interface LayoutContextValue {
  layouts: ILayouts;
}

export function useDataTypeFromLayoutSet(layoutSetName: string | undefined) {
  const layoutSets = getLayoutSets();
  return layoutSets.find((set) => set.id === layoutSetName)?.dataType;
}

export function LayoutsProvider({ children }: PropsWithChildren) {
  return children;
}
