import { useMemo, useRef } from 'react';

import deepEqual from 'fast-deep-equal';

import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { ExprValidation } from 'src/features/expressions/validation';
import { useHiddenLayoutsExpressions, useLayoutLookups, useLayouts } from 'src/features/form/layout/LayoutsContext';
import { useRawPageOrder } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { useShallowMemo } from 'src/hooks/useShallowMemo';
import { getComponentDef, implementsIsChildHidden } from 'src/layout';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useIsHiddenByRules, useIsHiddenByRulesMulti } from 'src/utils/layout/NodesContext';
import { useExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import type { EvalExprOptions } from 'src/features/expressions';
import type { ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { IHiddenLayoutsExternal } from 'src/types';
import type { ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';

export interface IsHiddenOptions<Reason extends boolean = false> {
  /**
   * Return an object that explains why the component was hidden? Defaults to false.
   */
  includeReason?: Reason;

  /**
   * Default = true. When false, we won't check if DevTools have overridden hidden status.
   */
  respectDevTools?: boolean;

  /**
   * Default = false. When true, we'll consider pages not part of the page order as hidden.
   */
  respectPageOrder?: boolean;
}

/**
 * Check if a given component is hidden.
 * @see
 */
export function useIsHidden<Reason extends boolean = false>(
  baseComponentId: string | undefined,
  options: IsHiddenOptions<Reason> = {},
) {
  const lastValue = useRef(baseComponentId);
  if (lastValue.current !== baseComponentId) {
    throw new Error("useIsHidden doesn't support changing the baseComponentId, that would break the rule of hooks");
  }

  const layoutLookups = useLayoutLookups();
  const hiddenPages = useHiddenLayoutsExpressions();
  const hiddenSources = findHiddenSources(baseComponentId, layoutLookups, hiddenPages).reverse();
  const dataSources = useExpressionDataSources(hiddenSources);
  const hiddenByRules = useIsHiddenByRules(useIndexedId(baseComponentId) ?? '');
  const forcedVisible = useIsForcedVisibleByDevTools();
  const pageOrder = useRawPageOrder();

  const reason = isHidden({
    hiddenByRules,
    hiddenSources,
    dataSources,
    pageOrder,
    pageKey: baseComponentId === undefined ? undefined : layoutLookups.componentToPage[baseComponentId],
    ...options,
  });

  if (reason.hidden && forcedVisible && options.respectDevTools !== false) {
    return (
      options.includeReason === true ? { reason: 'forcedByDeVTools', hidden: false } : false
    ) as Reason extends true ? HiddenWithReason : boolean;
  }

  return (options.includeReason === true ? reason : reason.hidden) as Reason extends true ? HiddenWithReason : boolean;
}

/**
 * Check if multiple components are hidden. Returns a mapping detailing which components are hidden.
 */
export function useIsHiddenMulti(
  _baseComponentIds: string[],
  options: Omit<IsHiddenOptions, 'includeReason'> = {},
): { [baseId: string]: boolean | undefined } {
  const baseComponentIds = useShallowMemo(_baseComponentIds);
  const lastValues = useRef(baseComponentIds);
  if (!deepEqual(lastValues.current, baseComponentIds)) {
    throw new Error(
      "useIsHiddenMulti doesn't support changing the baseComponentIds, that would break the rule of hooks",
    );
  }

  const layoutLookups = useLayoutLookups();
  const hiddenPages = useHiddenLayoutsExpressions();
  const hiddenSources = useMemo(
    () =>
      baseComponentIds.map((baseComponentId) =>
        findHiddenSources(baseComponentId, layoutLookups, hiddenPages).reverse(),
      ),
    [baseComponentIds, hiddenPages, layoutLookups],
  );
  const dataSources = useExpressionDataSources(hiddenSources);
  const hiddenByRules = useIsHiddenByRulesMulti(baseComponentIds);
  const forcedVisible = useIsForcedVisibleByDevTools();
  const pageOrder = useRawPageOrder();

  return useMemo(() => {
    const out: { [baseId: string]: boolean | undefined } = {};
    for (const [idx, baseComponentId] of baseComponentIds.entries()) {
      const reason = isHidden({
        hiddenByRules: hiddenByRules[baseComponentId] ?? false,
        hiddenSources: hiddenSources[idx],
        dataSources,
        pageOrder,
        pageKey: layoutLookups.componentToPage[baseComponentId],
      });
      if (reason.hidden && forcedVisible && options.respectDevTools !== false) {
        out[baseComponentId] = false;
      } else {
        out[baseComponentId] = reason.hidden;
      }
    }

    return out;
  }, [
    baseComponentIds,
    dataSources,
    forcedVisible,
    hiddenByRules,
    hiddenSources,
    layoutLookups.componentToPage,
    options.respectDevTools,
    pageOrder,
  ]);
}

/**
 * Check if a page is hidden
 */
export function useIsHiddenPage(pageKey: string | undefined, options: Omit<IsHiddenOptions, 'includeReason'> = {}) {
  const lastValue = useRef(pageKey);
  if (lastValue.current !== pageKey) {
    throw new Error("useIsHiddenPage doesn't support changing the pageKey, that would break the rule of hooks");
  }

  const hiddenExpressions = useHiddenLayoutsExpressions();
  const dataSources = useExpressionDataSources(hiddenExpressions);
  const pageOrder = useRawPageOrder();
  const forcedVisible = useIsForcedVisibleByDevTools();

  const hidden = isHiddenPage({ pageKey, dataSources, pageOrder, hiddenExpressions, ...options });

  if (hidden && forcedVisible && options.respectDevTools !== false) {
    return false;
  }

  return hidden;
}

/**
 * Check which pages are hidden, returning a Set with the ones that are hidden
 */
export function useHiddenPages(options: Omit<IsHiddenOptions, 'includeReason'> = {}): Set<string> {
  const pages = Object.keys(useLayouts());
  const hiddenExpressions = useHiddenLayoutsExpressions();
  const dataSources = useExpressionDataSources(hiddenExpressions);
  const pageOrder = useRawPageOrder();

  const out = new Set<string>();
  for (const pageKey of pages) {
    const hidden = isHiddenPage({ pageKey, dataSources, pageOrder, hiddenExpressions, ...options });
    if (hidden) {
      out.add(pageKey);
    }
  }

  return out;
}

interface IsHiddenProps extends Pick<IsHiddenOptions<boolean>, 'respectPageOrder'> {
  hiddenSources: HiddenSource[];
  dataSources: ExpressionDataSources;
  hiddenByRules: boolean;
  pageOrder: string[];
  pageKey: string | undefined;
}

export type HiddenWithReason =
  | {
      hidden: false;
      reason: undefined | 'forcedByDeVTools';
    }
  | {
      hidden: true;
      reason: HiddenSource['type'] | 'rules' | 'pageOrder';
    };

function isHidden({
  hiddenSources,
  dataSources,
  hiddenByRules,
  respectPageOrder = false,
  pageOrder,
  pageKey,
}: IsHiddenProps): HiddenWithReason {
  if (hiddenByRules) {
    return { reason: 'rules', hidden: true };
  }
  if (respectPageOrder && pageKey !== undefined && !pageOrder.includes(pageKey)) {
    return { reason: 'pageOrder', hidden: true };
  }

  for (const source of hiddenSources) {
    if (source.type === 'callback') {
      const hidden = source.callback();
      if (hidden) {
        return { reason: source.type, hidden: true };
      }
      continue;
    }

    const { type, expr, id } = source;
    const options: EvalExprOptions = {
      errorIntroText:
        type === 'hiddenPage'
          ? `Hidden expression for page ${id} failed`
          : `Expression in property ${type} for component ${id} failed`,
      defaultValue: false,
      returnType: ExprVal.Boolean,
    };

    if (!ExprValidation.isValidOrScalar(expr, ExprVal.Boolean)) {
      continue;
    }

    const hidden = evalExpr(expr, dataSources, options);
    if (hidden) {
      return { reason: type, hidden };
    }
  }

  return { reason: undefined, hidden: false };
}

interface Expr {
  type: 'hidden' | 'hiddenRow' | 'hiddenPage';
  expr: ExprValToActualOrExpr<ExprVal.Boolean>;
  id: string;
}

interface Callback {
  type: 'callback';
  callback: () => boolean;
  id: string;
}

type HiddenSource = Expr | Callback;

function findHiddenSources(
  baseComponentId: string | undefined,
  layoutLookups: LayoutLookups,
  hiddenPages: IHiddenLayoutsExternal,
): HiddenSource[] {
  const out: HiddenSource[] = [];
  if (baseComponentId === undefined) {
    return out;
  }

  const component = layoutLookups.allComponents[baseComponentId];
  if (component?.hidden !== undefined) {
    out.push({ type: 'hidden', expr: component.hidden, id: baseComponentId });
  }

  let childId = baseComponentId;
  let parent = layoutLookups.componentToParent[childId];
  while (parent?.type === 'node') {
    const parentComponent = layoutLookups.getComponent(parent.id);
    const parentDef = getComponentDef(parentComponent.type);
    if (implementsIsChildHidden(parentDef)) {
      const tmpParentId = parent.id;
      const tmpChildId = childId;
      const callback = () => parentDef.isChildHidden(tmpParentId, tmpChildId, layoutLookups);
      out.push({ type: 'callback', callback, id: parent.id });
    }
    if (
      parentComponent.type === 'RepeatingGroup' &&
      parentComponent.hiddenRow !== undefined &&
      parentComponent.children.includes(childId)
    ) {
      out.push({ type: 'hiddenRow', expr: parentComponent.hiddenRow, id: parent.id });
    }
    if (parentComponent.hidden !== undefined) {
      out.push({ type: 'hidden', expr: parentComponent.hidden, id: parent.id });
    }
    childId = parent.id;
    parent = layoutLookups.componentToParent[childId];
  }

  const page = layoutLookups.componentToPage[baseComponentId];
  const hiddenExpr = page === undefined ? undefined : hiddenPages[page];
  if (hiddenExpr !== undefined) {
    out.push({ type: 'hiddenPage', expr: hiddenExpr, id: page! });
  }

  return out;
}

function useIsForcedVisibleByDevTools() {
  return useDevToolsStore((state) => state.isOpen && state.hiddenComponents !== 'hide');
}

interface IsHiddenPageProps extends Pick<IsHiddenOptions<boolean>, 'respectPageOrder'> {
  pageKey: string | undefined;
  hiddenExpressions: IHiddenLayoutsExternal;
  dataSources: ExpressionDataSources;
  pageOrder: string[];
}

function isHiddenPage({
  pageOrder,
  pageKey,
  hiddenExpressions,
  dataSources,
  respectPageOrder = false,
}: IsHiddenPageProps) {
  if (pageKey === undefined) {
    return false;
  }
  if (respectPageOrder && !pageOrder.includes(pageKey)) {
    return true;
  }
  const hiddenExpr = hiddenExpressions[pageKey];
  if (hiddenExpr === undefined) {
    return false;
  }
  const options: EvalExprOptions = {
    errorIntroText: `Hidden expression for page ${pageKey} failed`,
    defaultValue: false,
    returnType: ExprVal.Boolean,
  };
  if (!ExprValidation.isValidOrScalar(hiddenExpr, ExprVal.Boolean)) {
    return false;
  }
  return evalExpr(hiddenExpr, dataSources, options);
}
