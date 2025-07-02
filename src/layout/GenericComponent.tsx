import React, { useMemo } from 'react';

import classNames from 'classnames';

import { Flex } from 'src/app-components/Flex/Flex';
import { ExprVal } from 'src/features/expressions/types';
import { NavigationResult, useFinishNodeNavigation } from 'src/features/form/layout/NavigateToNode';
import { Lang } from 'src/features/language/Lang';
import { FormComponentContextProvider } from 'src/layout/FormComponentContext';
import classes from 'src/layout/GenericComponent.module.css';
import { SummaryComponentFor } from 'src/layout/Summary/SummaryComponent';
import { pageBreakStyles } from 'src/utils/formComponentUtils';
import { isDev } from 'src/utils/isDev';
import { ComponentErrorBoundary } from 'src/utils/layout/ComponentErrorBoundary';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useEvalExpression } from 'src/utils/layout/generator/useEvalExpression';
import { useExternalItem } from 'src/utils/layout/hooks';
import { Hidden, NodesInternal, useNode } from 'src/utils/layout/NodesContext';
import type { EvalExprOptions } from 'src/features/expressions';
import type { IGridStyling } from 'src/layout/common.generated';
import type { GenericComponentOverrideDisplay, IFormComponentContext } from 'src/layout/FormComponentContext';
import type { PropsFromGenericComponent } from 'src/layout/index';
import type { CompInternal, CompTypes } from 'src/layout/layout';
import type { LayoutComponent } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface OverrideProps<Type extends CompTypes> {
  overrideItemProps?: Partial<Omit<CompInternal<Type>, 'id'>>;
  overrideDisplay?: GenericComponentOverrideDisplay;
}

export interface IGenericComponentProps<Type extends CompTypes> extends OverrideProps<Type> {
  node: LayoutNode<Type>;
}

export interface IGenericComponentByIdProps<Type extends CompTypes> extends OverrideProps<Type> {
  id: string;
}

/**
 * This works like GenericComponentById, but lets you pass a baseId instead (a plain component id without
 * indexes if inside a repeating group)
 */
export function GenericComponentByBaseId<Type extends CompTypes = CompTypes>(props: IGenericComponentByIdProps<Type>) {
  const id = useIndexedId(props.id);

  return (
    <GenericComponentById
      {...props}
      id={id}
    />
  );
}

/**
 * Lazily renders a component referenced by a component ID. This is useful when you want to optimize rendering
 * (for example in Form.tsx) where it's important that a component does not re-render when other nodes in the
 * node hierarchy have been re-created.
 */
export function GenericComponentById<Type extends CompTypes = CompTypes>(props: IGenericComponentByIdProps<Type>) {
  const node = useNode(props.id);
  if (!node) {
    return false;
  }

  return (
    <GenericComponent
      node={node}
      overrideItemProps={props.overrideItemProps}
      overrideDisplay={props.overrideDisplay}
    />
  );
}

function NonMemoGenericComponent<Type extends CompTypes = CompTypes>({
  node,
  overrideItemProps,
  overrideDisplay,
}: IGenericComponentProps<Type>) {
  const generatorErrors = NodesInternal.useNodeData(node, (node) => node.errors);

  if (generatorErrors && Object.keys(generatorErrors).length > 0) {
    return (
      <ErrorList
        node={node}
        errors={Object.keys(generatorErrors)}
      />
    );
  }

  if (!node) {
    return false;
  }

  return (
    <ComponentErrorBoundary node={node}>
      <ActualGenericComponent<Type>
        node={node}
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
  node,
  overrideItemProps,
  overrideDisplay,
}: IGenericComponentProps<Type>) {
  if (!node) {
    throw new Error(`Node not found`);
  }

  const component = useExternalItem(node.baseId);
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
    errorIntroText: `Invalid expression for component ${node.baseId}`,
  };
  const breakBefore = useEvalExpression(pageBreakUnresolved?.breakBefore, options);
  const breakAfter = useEvalExpression(pageBreakUnresolved?.breakAfter, options);
  const pageBreak = overrideItemProps?.pageBreak ?? { breakBefore, breakAfter };
  const id = node.id;
  const containerDivRef = React.useRef<HTMLDivElement | null>(null);
  const isHidden = Hidden.useIsHidden(node);

  const formComponentContext = useMemo<IFormComponentContext>(
    () => ({
      grid,
      baseComponentId: node.baseId,
      overrideItemProps,
      overrideDisplay,
    }),
    [grid, node, overrideItemProps, overrideDisplay],
  );

  useFinishNodeNavigation(async (targetNode, options, onHit) => {
    if (targetNode.id !== id) {
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

    const shouldFocus = options?.shouldFocus ?? false;
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
          if (
            options?.error &&
            'bindingKey' in options.error &&
            element?.dataset?.bindingkey === options.error.bindingKey
          ) {
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

  if (isHidden) {
    return null;
  }

  const layoutComponent = node.def as unknown as LayoutComponent<Type>;
  const RenderComponent = layoutComponent.render;

  const componentProps: PropsFromGenericComponent<Type> = {
    containerDivRef,
    node: node as unknown as LayoutNode<Type>,
    overrideItemProps,
    overrideDisplay,
  };

  if (renderAsSummary) {
    const RenderSummary = 'renderSummary' in node.def ? node.def.renderSummary.bind(node.def) : null;
    if (!RenderSummary) {
      return null;
    }

    return (
      <SummaryComponentFor
        targetNode={node}
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
        data-componentbaseid={node.baseId}
        data-componentid={node.id}
        data-componenttype={node.type}
        ref={containerDivRef}
        item
        container
        size={grid}
        key={`grid-${id}`}
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

const ErrorList = ({ node, errors }: { node: LayoutNode; errors: string[] }) => {
  const id = node.id;
  if (!isDev()) {
    return null;
  }

  return (
    <div className={classes.errorFallback}>
      <h3>
        <Lang
          id='config_error.component_has_errors'
          params={[id]}
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
};
