import React, { useMemo } from 'react';

import { Grid } from '@material-ui/core';
import classNames from 'classnames';

import { ContextNotProvided } from 'src/core/contexts/context';
import { useLayoutValidationForNode } from 'src/features/devtools/layoutValidation/useLayoutValidation';
import { NavigationResult, useFinishNodeNavigation } from 'src/features/form/layout/NavigateToNode';
import { Lang } from 'src/features/language/Lang';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { useIsDev } from 'src/hooks/useIsDev';
import { FormComponentContextProvider } from 'src/layout/FormComponentContext';
import classes from 'src/layout/GenericComponent.module.css';
import { GenericComponentDescription, GenericComponentLabel } from 'src/layout/GenericComponentUtils';
import { shouldComponentRenderLabel } from 'src/layout/index';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import { gridBreakpoints, pageBreakStyles } from 'src/utils/formComponentUtils';
import { useIsHiddenComponent, useNode } from 'src/utils/layout/NodesContext';
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
  let item = node.item;
  const id = item.id;

  if (overrideItemProps) {
    item = {
      ...item,
      ...overrideItemProps,
    };
  }

  const containerDivRef = React.useRef<HTMLDivElement | null>(null);
  const validations = useUnifiedValidationsForNode(node);
  const isValid = !hasValidationErrors(validations);
  const isHidden = useIsHiddenComponent();

  // If maxLength is set in both schema and component, don't display the schema error message
  const maxLength = 'maxLength' in node.item && node.item.maxLength;
  const filteredValidationErrors = maxLength
    ? validations.filter(
        (validation) =>
          !(validation.message.key === 'validation_errors.maxLength' && validation.message.params?.at(0) === maxLength),
      )
    : validations;

  const formComponentContext = useMemo<IFormComponentContext>(
    () => ({
      grid: item.grid,
      id,
      baseComponentId: item.baseComponentId,
      node,
    }),
    [item.baseComponentId, item.grid, id, node],
  );

  useFinishNodeNavigation(async (targetNode, shouldFocus, onHit) => {
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

    const maybeInput = containerDivRef.current.querySelector('input,textarea,select,p') as
      | HTMLSelectElement
      | HTMLInputElement
      | HTMLTextAreaElement;

    if (maybeInput) {
      maybeInput.focus();
    }

    return NavigationResult.SuccessfulWithFocus;
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

  const showValidationMessages = layoutComponent.renderDefaultValidations();

  if ('renderAsSummary' in node.item && node.item.renderAsSummary) {
    const RenderSummary = 'renderSummary' in node.def ? node.def.renderSummary.bind(node.def) : null;

    if (!RenderSummary) {
      return null;
    }

    return (
      <SummaryComponent
        summaryNode={node as LayoutNode<'Summary'>}
        overrides={{ display: { hideChangeButton: true } }}
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
        data-componentbaseid={item.baseComponentId || item.id}
        data-componentid={item.id}
        data-componenttype={item.type}
        ref={containerDivRef}
        item={true}
        container={true}
        {...gridBreakpoints(item.grid)}
        key={`grid-${id}`}
        className={classNames(
          classes.container,
          gridToClasses(item.grid?.labelGrid, classes),
          pageBreakStyles(item.pageBreak),
        )}
        alignItems='baseline'
      >
        {shouldComponentRenderLabel(node.item.type) && overrideDisplay?.renderLabel !== false && (
          <Grid
            item={true}
            {...gridBreakpoints(item.grid?.labelGrid)}
          >
            <GenericComponentLabel />
            <GenericComponentDescription />
          </Grid>
        )}
        <Grid
          key={`form-content-${id}`}
          item={true}
          id={`form-content-${id}`}
          {...gridBreakpoints(item.grid?.innerGrid)}
        >
          <RenderComponent {...componentProps} />
          {showValidationMessages && (
            <ComponentValidations
              validations={filteredValidationErrors}
              node={node}
            />
          )}
        </Grid>
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
