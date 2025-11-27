import { makeLayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useLayoutQuery } from 'src/http-client/api-client/layoutQuery';
import type { ILayouts } from 'src/layout/layout';
import type { IHiddenLayoutsExternal } from 'src/types';

export function useDataTypeFromLayoutSet(layoutSetName: string | undefined) {
  const layoutSets = useLayoutSets();
  return layoutSets.find((set) => set.id === layoutSetName)?.dataType;
}

const emptyLayouts: ILayouts = {};

export const useLayouts = (): ILayouts => {
  const layouts = useLayoutQuery().data?.layouts;
  if (!layouts) {
    return emptyLayouts;
  }
  return layouts;
};

export const useLayoutLookups = () => {
  const lookups = useLayoutQuery().data?.lookups;
  if (!lookups) {
    return makeLayoutLookups(emptyLayouts);
  }
  return lookups;
};
export const useLayoutLookupsLax = () => useLayoutLookups();

const noExpressions: IHiddenLayoutsExternal = {};

export const useHiddenLayoutsExpressions = () => {
  const hiddenLayoutsExpressions = useLayoutQuery().data?.hiddenLayoutsExpressions;

  if (!hiddenLayoutsExpressions) {
    return noExpressions;
  }
  return hiddenLayoutsExpressions;
};

export const useExpandedWidthLayouts = () => {
  const expandedWidthLayouts = useLayoutQuery().data?.expandedWidthLayouts;

  if (!expandedWidthLayouts) {
    return noExpressions;
  }
  return expandedWidthLayouts;
};
