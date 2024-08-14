import React, { useMemo } from 'react';

import { Grid } from '@material-ui/core';
import classNames from 'classnames';

import { ContextNotProvided } from 'src/core/contexts/context';
import { useLayoutValidationForNode } from 'src/features/devtools/layoutValidation/useLayoutValidation';
import { NavigationResult, useFinishNodeNavigation } from 'src/features/form/layout/NavigateToNode';
import { Lang } from 'src/features/language/Lang';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { useIsDev } from 'src/hooks/useIsDev';
import { FormComponentContextProvider } from 'src/layout/FormComponentContext';
import classes from 'src/layout/GenericComponent.module.css';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import { gridBreakpoints, pageBreakStyles } from 'src/utils/formComponentUtils';
import { useIsHiddenComponent, useNode } from 'src/utils/layout/NodesContext';
import type { NodeValidation } from 'src/features/validation';
import type { IGridStyling } from 'src/layout/common.generated';
import type { GenericComponentOverrideDisplay, IFormComponentContext } from 'src/layout/FormComponentContext';
import type { PropsFromGenericComponent } from 'src/layout/index';
import type { CompInternal, CompTypes } from 'src/layout/layout';
import type { LayoutComponent } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface IGenericComponentProps<Type extends CompTypes> {
  node: LayoutNode<Type>;
  overrideItemProps?: Partial<Omit<CompInternal<Type>, 'id'>>;
  overrideDisplay?: GenericComponentOverrideDisplay;
}

/**
 * Lazily renders a component referenced by a component ID. This is useful when you want to optimize rendering
 * (for example in Form.tsx) where it's important that a component does not re-render when other nodes in the
 * node hierarchy have been re-created.
 */
export function GenericComponentById({ id }: { id: string }) {
  const node = useNode(id);
  if (!node) {
    throw new Error(`Node with id ${id} not found`);
  }

  return <GenericComponent node={node} />;
}

export function GenericComponent<Type extends CompTypes = CompTypes>({
  node,
  overrideItemProps,
  overrideDisplay,
}: IGenericComponentProps<Type>) {
  const layoutErrors = useLayoutValidationForNode(node);
  if (layoutErrors !== ContextNotProvided && layoutErrors?.length !== undefined && layoutErrors?.length > 0) {
    return (
      <ErrorList
        node={node}
        errors={layoutErrors}
      />
    );
  }

  return (
    <ActualGenericComponent<Type>
      node={node}
      overrideItemProps={overrideItemProps}
      overrideDisplay={overrideDisplay}
    />
  );
}

function ActualGenericComponent<Type extends CompTypes = CompTypes>({
  node,
  overrideItemProps,
  overrideDisplay,
}: IGenericComponentProps<Type>) {
  const id = node.item.id;
  const item = overrideItemProps ? { ...node.item, ...overrideItemProps } : { ...node.item };

  const containerDivRef = React.useRef<HTMLDivElement | null>(null);
  const validations = useUnifiedValidationsForNode(node);
  const isValid = !hasValidationErrors(validations);
  const isHidden = useIsHiddenComponent();

  const formComponentContext = useMemo<IFormComponentContext>(
    () => ({
      grid: item.grid,
      id,
      baseComponentId: item.baseComponentId,
      node,
      overrideItemProps,
      overrideDisplay,
    }),
    [item.grid, item.baseComponentId, id, node, overrideItemProps, overrideDisplay],
  );

  useFinishNodeNavigation(async (targetNode, shouldFocus, onHit, error?: NodeValidation<'error'>) => {
    if (targetNode.item.id !== id) {
      return undefined;
    }
    onHit();
    let retryCount = 0;
    while (!containerDivRef.current && retryCount < 100) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retryCount++;
    }
    if (!containerDivRef.current) {
      return NavigationResult.SuccessfulFailedToRender;
    }
    requestAnimationFrame(() => containerDivRef.current?.scrollIntoView());

    if (!shouldFocus) {
      // Hooray, we've arrived at the component, but we don't need to focus it.
      return NavigationResult.SuccessfulNoFocus;
    }

    const targetHtmlNodes = containerDivRef.current?.querySelectorAll('input,textarea,select,p');

    if (targetHtmlNodes) {
      if (targetHtmlNodes.length === 1) {
        (targetHtmlNodes[0] as HTMLElement).focus();
        return NavigationResult.SuccessfulWithFocus;
      }

      if (targetHtmlNodes.length > 1) {
        let didBreak = false;
        for (const node of Array.from(targetHtmlNodes)) {
          const element = node as HTMLInputElement;
          if (element?.dataset?.bindingkey === error?.bindingKey) {
            element.focus();
            didBreak = true;
            break;
          }
        }

        if (didBreak) {
          return NavigationResult.SuccessfulWithFocus;
        } else {
          (targetHtmlNodes[0] as HTMLElement).focus();
          return NavigationResult.SuccessfulWithFocus;
        }
      }
    }
  });

  if (isHidden(node.item.id) || (node.item.baseComponentId && isHidden(node.item.baseComponentId))) {
    return null;
  }

  const layoutComponent = node.def as unknown as LayoutComponent<Type>;
  const RenderComponent = layoutComponent.render;

  const componentProps: PropsFromGenericComponent<Type> = {
    containerDivRef,
    isValid,
    node: node as unknown as LayoutNode<Type>,
    overrideItemProps,
    overrideDisplay,
  };

  if ('renderAsSummary' in node.item && node.item.renderAsSummary) {
    const RenderSummary = 'renderSummary' in node.def ? node.def.renderSummary.bind(node.def) : null;

    if (!RenderSummary) {
      return null;
    }

    return (
      <SummaryComponent
        summaryNode={node as LayoutNode<'Summary'>}
        overrides={{ display: { hideChangeButton: true, hideValidationMessages: true } }}
      />
    );
  }

  if (layoutComponent.directRender(componentProps) || overrideDisplay?.directRender) {
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
      <Grid
        data-componentbaseid={item.baseComponentId ?? item.id}
        data-componentid={item.id}
        data-componenttype={item.type}
        ref={containerDivRef}
        item
        container
        {...gridBreakpoints(item.grid)}
        key={`grid-${id}`}
        className={classNames(
          classes.container,
          gridToClasses(item.grid?.labelGrid, classes),
          pageBreakStyles(item.pageBreak),
        )}
        alignItems='baseline'
      >
        <RenderComponent {...componentProps} />
      </Grid>
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

const ErrorList = ({ node, errors }: { node: LayoutNode; errors: string[] }) => {
  const { id } = node.item;
  const isDev = useIsDev();
  if (!isDev) {
    return null;
  }

  return (
    <div className={classes.errorFallback}>
      <h3>
        <Lang
          id={'config_error.component_has_errors'}
          params={[id]}
        />
      </h3>
      <ul>
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
      <p>
        <Lang id={'config_error.component_has_errors_after'} />
      </p>
    </div>
  );
};
