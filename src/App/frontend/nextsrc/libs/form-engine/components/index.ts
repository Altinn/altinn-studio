import type { ComponentType, ReactNode } from 'react';

import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';

export interface ComponentProps {
  component: ResolvedCompExternal;
  renderChildren: (children: ResolvedCompExternal[]) => ReactNode;
  parentBinding?: string;
  itemIndex?: number;
}

export type ComponentMap = Record<string, ComponentType<ComponentProps>>;
