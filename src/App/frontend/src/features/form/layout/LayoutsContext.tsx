import type { PropsWithChildren } from 'react';

import { ContextNotProvided } from 'src/core/contexts/context';
import { getLayoutSets } from 'src/features/form/layoutSets';
import { useFormBootstrap, useLaxFormBootstrap } from 'src/features/formBootstrap/FormBootstrapProvider';
import type { ILayouts } from 'src/layout/layout';

export interface LayoutContextValue {
  layouts: ILayouts;
}

export function useDataTypeFromLayoutSet(layoutSetName: string | undefined) {
  const layoutSets = getLayoutSets();
  return layoutSets.find((set) => set.id === layoutSetName)?.dataType;
}

const emptyLayouts: ILayouts = {};
const noExpressions = {};

export function LayoutsProvider({ children }: PropsWithChildren) {
  return children;
}

export const useLayouts = (): ILayouts => {
  const bootstrap = useLaxFormBootstrap();
  return bootstrap === ContextNotProvided ? emptyLayouts : bootstrap.layouts;
};

export const useLayoutLookups = () => useFormBootstrap().layoutLookups;

export const useLayoutLookupsLax = () => {
  const bootstrap = useLaxFormBootstrap();
  return bootstrap === ContextNotProvided ? undefined : bootstrap.layoutLookups;
};

export const useHiddenLayoutsExpressions = () => {
  const bootstrap = useLaxFormBootstrap();
  return bootstrap === ContextNotProvided ? noExpressions : bootstrap.hiddenLayoutsExpressions;
};

export const useExpandedWidthLayouts = () => useFormBootstrap().expandedWidthLayouts;
