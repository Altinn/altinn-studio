import React, { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigation, useSearchParams } from 'react-router-dom';
import type { SetURLSearchParams } from 'react-router-dom';

import classNames from 'classnames';

import { Flex } from 'src/app-components/Flex/Flex';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { ExprVal } from 'src/features/expressions/types';
import { Lang } from 'src/features/language/Lang';
import { SearchParams } from 'src/hooks/navigation';
import { FormComponentContextProvider } from 'src/layout/FormComponentContext';
import classes from 'src/layout/GenericComponent.module.css';
import { getComponentDef } from 'src/layout/index';
import { SummaryComponentFor } from 'src/layout/Summary/SummaryComponent';
import { pageBreakStyles } from 'src/utils/formComponentUtils';
import { isDev } from 'src/utils/isDev';
import { ComponentErrorBoundary } from 'src/utils/layout/ComponentErrorBoundary';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useEvalExpression } from 'src/utils/layout/generator/useEvalExpression';
import { useIsHidden } from 'src/utils/layout/hidden';
import { useExternalItem } from 'src/utils/layout/hooks';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { EvalExprOptions } from 'src/features/expressions';
import type { IGridStyling } from 'src/layout/common.generated';
import type { GenericComponentOverrideDisplay, IFormComponentContext } from 'src/layout/FormComponentContext';
import type { PropsFromGenericComponent } from 'src/layout/index';
import type { CompInternal, CompTypes } from 'src/layout/layout';
import type { AnyComponent } from 'src/layout/LayoutComponent';

export interface IGenericComponentProps<Type extends CompTypes> {
  baseComponentId: string;
  overrideItemProps?: Partial<Omit<CompInternal<Type>, 'id'>>;
  overrideDisplay?: GenericComponentOverrideDisplay;
}

function NonMemoGenericComponent<Type extends CompTypes = CompTypes>({
  baseComponentId,
  overrideItemProps,
  overrideDisplay,
}: IGenericComponentProps<Type>) {
  const nodeId = useIndexedId(baseComponentId);
  const generatorErrors = NodesInternal.useNodeData(nodeId, undefined, (node) => node.errors);

  if (generatorErrors && Object.keys(generatorErrors).length > 0) {
    return (
      <ComponentErrorList
        baseComponentId={baseComponentId}
        errors={Object.keys(generatorErrors)}
      />
    );
  }

  return (
    <ComponentErrorBoundary nodeId={nodeId}>
      <ActualGenericComponent<Type>
        baseComponentId={baseComponentId}
        overrideItemProps={overrideItemProps}
        overrideDisplay={overrideDisplay}
      />
    </ComponentErrorBoundary>
  );
}
const MemoGenericComponent = React.memo(NonMemoGenericComponent);
MemoGenericComponent.displayName = 'GenericComponent';
export const GenericComponent = MemoGenericComponent as typeof NonMemoGenericComponent;

function ActualGenericComponent<Type extends CompTypes = CompTypes>({
  baseComponentId,
  overrideItemProps,
  overrideDisplay,
}: IGenericComponentProps<Type>) {
  const component = useExternalItem(baseComponentId);
  const grid = overrideItemProps?.grid ?? component?.grid;
  const renderAsSummary =
    overrideItemProps && 'renderAsSummary' in overrideItemProps && overrideItemProps.renderAsSummary !== undefined
      ? overrideItemProps.renderAsSummary
      : component && 'renderAsSummary' in component
        ? component.renderAsSummary
        : undefined;
  const pageBreakUnresolved = component?.pageBreak;
  const options: EvalExprOptions<ExprVal.String> = {
    returnType: ExprVal.String,
    defaultValue: '',
    errorIntroText: `Invalid expression for component ${baseComponentId}`,
  };
  const breakBefore = useEvalExpression(pageBreakUnresolved?.breakBefore, options);
  const breakAfter = useEvalExpression(pageBreakUnresolved?.breakAfter, options);
  const pageBreak = overrideItemProps?.pageBreak ?? { breakBefore, breakAfter };
  const nodeId = useIndexedId(baseComponentId);
  const containerDivRef = React.useRef<HTMLDivElement | null>(null);
  const hiddenState = useIsHidden(baseComponentId, { includeReason: true });
  const howToHide = useDevToolsStore((state) => (state.isOpen ? state.hiddenComponents : 'hide'));

  useHandleFocusComponent(nodeId, containerDivRef);

  useEffect(() => {
    if (containerDivRef.current && hiddenState.reason === 'forcedByDeVTools' && howToHide === 'disabled') {
      containerDivRef.current.style.filter = 'contrast(0.75)';
    } else if (containerDivRef.current) {
      containerDivRef.current.style.filter = '';
    }
  }, [hiddenState, howToHide]);

  const formComponentContext = useMemo<IFormComponentContext>(
    () => ({
      grid,
      baseComponentId,
      overrideItemProps,
      overrideDisplay,
    }),
    [grid, baseComponentId, overrideItemProps, overrideDisplay],
  );
  if (hiddenState.hidden) {
    return null;
  }

  const layoutComponent = getComponentDef(component.type);
  const RenderComponent = layoutComponent.render as AnyComponent<Type>['render'];

  const componentProps: PropsFromGenericComponent<Type> = {
    containerDivRef,
    baseComponentId,
    overrideItemProps,
    overrideDisplay,
  };

  if (renderAsSummary) {
    const RenderSummary =
      'renderSummary' in layoutComponent ? layoutComponent.renderSummary.bind(layoutComponent) : null;
    if (!RenderSummary) {
      return null;
    }

    return (
      <SummaryComponentFor
        targetBaseComponentId={baseComponentId}
        overrides={{
          display: { hideChangeButton: true, hideValidationMessages: true },
        }}
      />
    );
  }

  if (overrideDisplay?.directRender || layoutComponent.directRender()) {
    return (
      <FormComponentContextProvider value={formComponentContext}>
        <RenderComponent
          {...componentProps}
          ref={containerDivRef}
        />
      </FormComponentContextProvider>
    );
  }
  return (
    <FormComponentContextProvider value={formComponentContext}>
      <Flex
        data-componentbaseid={baseComponentId}
        data-componentid={nodeId}
        data-componenttype={component.type}
        ref={containerDivRef}
        item
        container
        size={grid}
        key={`grid-${nodeId}`}
        className={classNames(classes.container, gridToClasses(grid?.labelGrid, classes), pageBreakStyles(pageBreak))}
      >
        <RenderComponent {...componentProps} />
      </Flex>
    </FormComponentContextProvider>
  );
}

const gridToClasses = (labelGrid: IGridStyling | undefined, classes: { [key: string]: string }) => {
  if (!labelGrid) {
    return {};
  }

  return {
    [classes.xs]: labelGrid.xs !== undefined && labelGrid.xs !== 'auto' && labelGrid.xs > 0 && labelGrid.xs < 12,
    [classes.sm]: labelGrid.sm !== undefined && labelGrid.sm !== 'auto' && labelGrid.sm > 0 && labelGrid.sm < 12,
    [classes.md]: labelGrid.md !== undefined && labelGrid.md !== 'auto' && labelGrid.md > 0 && labelGrid.md < 12,
    [classes.lg]: labelGrid.lg !== undefined && labelGrid.lg !== 'auto' && labelGrid.lg > 0 && labelGrid.lg < 12,
    [classes.xl]: labelGrid.xl !== undefined && labelGrid.xl !== 'auto' && labelGrid.xl > 0 && labelGrid.xl < 12,
  };
};

export function ComponentErrorList({ baseComponentId, errors }: { baseComponentId: string; errors: string[] }) {
  if (!isDev()) {
    return null;
  }

  return (
    <div className={classes.errorFallback}>
      <h3>
        <Lang
          id='config_error.component_has_errors'
          params={[baseComponentId]}
        />
      </h3>
      <ul>
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
      <p>
        <Lang id='config_error.component_has_errors_after' />
      </p>
    </div>
  );
}

function useHandleFocusComponent(nodeId: string, containerDivRef: React.RefObject<HTMLDivElement | null>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const indexedId = searchParams.get(SearchParams.FocusComponentId);
  const errorBinding = searchParams.get(SearchParams.FocusErrorBinding);
  const isNavigating = useNavigation().state !== 'idle';

  const location = useLocation();
  const abortController = useRef(new AbortController());

  const hashWas = window.location.hash;
  const locationIsUpdated = hashWas.endsWith(location.search);
  const shouldFocus = indexedId && indexedId == nodeId && !isNavigating && locationIsUpdated;

  useEffect(() => {
    const div = containerDivRef.current;
    if (shouldFocus && div) {
      try {
        requestAnimationFrame(() => {
          !abortController.current.signal.aborted && div.scrollIntoView({ behavior: 'instant' });
        });

        const field = findElementToFocus(div, errorBinding);
        if (field && !abortController.current.signal.aborted) {
          field.focus();
        }
      } finally {
        if (!abortController.current.signal.aborted && hashWas === window.location.hash) {
          // Only cleanup when hash is the same as what it was during render. Navigation might have occurred, especially
          // in Cypress tests where state changes will happen rapidly. These search params are cleaned up in
          // useNavigatePage() automatically, so it shouldn't be a problem if the page has been changed. If something
          // else happens, we'll re-render and get a new chance to clean up later.
          cleanupQuery(searchParams, setSearchParams);
        }
      }
    }
  }, [containerDivRef, errorBinding, hashWas, nodeId, searchParams, setSearchParams, shouldFocus]);

  useEffect(
    () => () => {
      // Abort on unmount so that we do not keep trying to focus this component
      abortController.current.abort();
    },
    [abortController],
  );
}

function cleanupQuery(searchParams: URLSearchParams, setSearchParams: SetURLSearchParams) {
  if (searchParams.has(SearchParams.FocusComponentId) || searchParams.has(SearchParams.FocusErrorBinding)) {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete(SearchParams.FocusComponentId);
    newSearchParams.delete(SearchParams.FocusErrorBinding);
    setSearchParams(newSearchParams, { replace: true });
  }
}

function findElementToFocus(div: HTMLDivElement | null, binding: string | null) {
  const targetElements = div?.querySelectorAll('input,textarea,select,p');
  const targetHtmlElements = targetElements
    ? Array.from(targetElements).filter((node) => node instanceof HTMLElement)
    : [];

  if (targetHtmlElements?.length > 0) {
    const elementWithBinding = binding
      ? Array.from(targetHtmlElements).find((htmlElement) => htmlElement && htmlElement.dataset.bindingkey === binding)
      : undefined;

    return elementWithBinding ?? targetHtmlElements[0];
  }

  return undefined;
}
