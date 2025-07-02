import React from 'react';

import cn from 'classnames';

import { Flex } from 'src/app-components/Flex/Flex';
import { ErrorPaper } from 'src/components/message/ErrorPaper';
import { useNavigateToNode } from 'src/features/form/layout/NavigateToNode';
import { useSetReturnToView, useSetSummaryNodeOfOrigin } from 'src/features/form/layout/PageNavigationContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useNavigationParam } from 'src/features/routing/AppRoutingContext';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { GenericComponent } from 'src/layout/GenericComponent';
import classes from 'src/layout/Summary/SummaryComponent.module.css';
import { SummaryContent } from 'src/layout/Summary/SummaryContent';
import { pageBreakStyles } from 'src/utils/formComponentUtils';
import { Hidden, useNode } from 'src/utils/layout/NodesContext';
import { useItemFor, useItemWhenType } from 'src/utils/layout/useNodeItem';
import { useGetUniqueKeyFromObject } from 'src/utils/useGetKeyFromObject';
import type { ExprResolved } from 'src/features/expressions/types';
import type { IGrid, IPageBreak } from 'src/layout/common.generated';
import type { SummaryDisplayProperties } from 'src/layout/Summary/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * These overrides include all props from the Summary component that should be forwarded to underlying component
 * summaries. This way we only fetch the settings in the SummaryComponent render cycle, and then pass the config
 * down to the internal summary components, so that all underlying code can work the same regardless if there is an
 * actual Summary component in the layout or not. Cases when there's not a real Summary component include:
 * - Automatic PDF layout
 * - Using the `renderAsSummary` prop on a component
 */
export interface LegacySummaryOverrides {
  grid?: IGrid;
  largeGroup?: boolean;
  display?: SummaryDisplayProperties;
  pageBreak?: ExprResolved<IPageBreak>;
  excludedChildren?: string[];
}

export const SummaryComponentFor = React.forwardRef(function (
  { targetNode, overrides }: { targetNode: LayoutNode; overrides?: LegacySummaryOverrides },
  ref: React.Ref<HTMLDivElement>,
) {
  const targetItem = useItemFor(targetNode.baseId);

  return (
    <SummaryComponentInner
      ref={ref}
      targetNode={targetNode}
      summaryTestId={targetNode.id}
      originNodeId={targetNode.id}
      componentId={`summary-${targetNode?.id}`}
      componentBaseId={`summary-${targetNode.id}`}
      display={overrides?.display}
      grid={overrides?.display && overrides?.display.useComponentGrid ? overrides?.grid || targetItem?.grid : undefined}
      pageBreak={overrides?.pageBreak ?? targetItem?.pageBreak}
      largeGroup={overrides?.largeGroup}
      excludedChildren={overrides?.excludedChildren}
    />
  );
});

SummaryComponentFor.displayName = 'SummaryComponentFor';

/**
 * This component renders the alternative where only a `summaryNode` is provided, and the target node is inferred
 * from that `summaryNode`.
 */
export const SummaryComponent = React.forwardRef(function (
  { summaryNode, overrides }: { summaryNode: LayoutNode<'Summary'>; overrides?: LegacySummaryOverrides },
  ref: React.Ref<HTMLDivElement>,
) {
  const summaryItem = useItemWhenType(summaryNode.baseId, 'Summary');
  const targetNode = useNode(summaryItem.componentRef);
  const { grid, pageBreak } = useItemFor(targetNode.baseId);

  if (!targetNode) {
    throw new Error(
      `No target found for Summary '${summaryNode.id}'. ` +
        `Check the 'componentRef' property and make sure the target component exists.`,
    );
  }

  return (
    <SummaryComponentInner
      ref={ref}
      targetNode={targetNode}
      summaryTestId={summaryNode?.id ?? targetNode?.id ?? 'unknown'}
      originNodeId={summaryNode?.id ?? targetNode?.id}
      componentId={summaryNode?.id ?? `summary-${targetNode?.id}`}
      componentBaseId={summaryNode?.baseId ?? `summary-${targetNode.id}`}
      display={overrides?.display ?? summaryItem?.display}
      grid={
        overrides?.display && overrides?.display.useComponentGrid
          ? overrides?.grid || grid
          : overrides?.grid || summaryItem?.grid
      }
      pageBreak={overrides?.pageBreak ?? summaryItem?.pageBreak ?? pageBreak}
      largeGroup={overrides?.largeGroup ?? summaryItem?.largeGroup}
      excludedChildren={overrides?.excludedChildren ?? summaryItem?.excludedChildren}
    />
  );
});

SummaryComponent.displayName = 'SummaryComponent';

interface ISummaryProps extends LegacySummaryOverrides {
  originNodeId: string;
  targetNode: LayoutNode;
  summaryTestId: string;
  componentId: string;
  componentBaseId: string;
}

const SummaryComponentInner = React.forwardRef(function (
  {
    originNodeId,
    targetNode,
    display,
    pageBreak,
    grid,
    componentId,
    componentBaseId,
    summaryTestId,
    largeGroup,
    excludedChildren,
  }: ISummaryProps,
  ref: React.Ref<HTMLDivElement>,
) {
  const targetItem = useItemFor(targetNode.baseId);
  const { langAsString } = useLanguage();
  const getUniqueKeyFromObject = useGetUniqueKeyFromObject();
  const currentPageId = useNavigationParam('pageKey');

  const targetView = targetNode.pageKey;
  const targetIsHidden = Hidden.useIsHidden(targetNode);

  const validations = useUnifiedValidationsForNode(targetNode);
  const errors = validationsOfSeverity(validations, 'error');

  const navigateTo = useNavigateToNode();
  const setReturnToView = useSetReturnToView();
  const setNodeOfOrigin = useSetSummaryNodeOfOrigin();

  const onChangeClick = async () => {
    if (!targetView || !targetNode) {
      return;
    }

    setReturnToView?.(currentPageId);
    setNodeOfOrigin?.(originNodeId);
    await navigateTo(targetNode, {
      shouldFocus: true,
      pageNavOptions: {
        resetReturnToView: false,
      },
    });
  };

  if (targetIsHidden || targetNode.type === 'Summary') {
    return null;
  }

  const component = targetNode.def;
  const RenderSummary = 'renderSummary' in component ? component.renderSummary.bind(component) : null;
  const shouldShowBorder =
    RenderSummary && 'renderSummaryBoilerplate' in component && component?.renderSummaryBoilerplate();

  return (
    <Flex
      ref={ref}
      item
      size={{
        xs: grid?.xs ?? 12,
        sm: grid?.sm,
        md: grid?.md,
        lg: grid?.lg,
        xl: grid?.xl,
      }}
      data-testid={`summary-${summaryTestId}`}
      data-componentid={componentId}
      data-componentbaseid={componentBaseId}
      className={cn(pageBreakStyles(pageBreak))}
    >
      <Flex
        container
        className={cn({
          [classes.border]: !display?.hideBottomBorder && shouldShowBorder,
        })}
      >
        {RenderSummary && 'renderSummaryBoilerplate' in component ? (
          <SummaryContent
            onChangeClick={onChangeClick}
            changeText={langAsString('form_filler.summary_item_change')}
            targetNode={targetNode}
            overrides={{ largeGroup, display, pageBreak, grid, excludedChildren }}
            RenderSummary={RenderSummary}
          />
        ) : (
          <GenericComponent node={targetNode} />
        )}
        {errors.length && targetItem.type !== 'Group' && !display?.hideValidationMessages ? (
          <Flex
            container
            style={{ paddingTop: '12px' }}
            spacing={4}
          >
            {errors.map((error) => {
              const key = getUniqueKeyFromObject(error);
              const message = error.message;

              return (
                <ErrorPaper
                  key={key}
                  message={
                    <Lang
                      id={message.key}
                      params={message.params}
                    />
                  }
                />
              );
            })}
            <Flex
              item
              size={{ xs: 12 }}
            >
              {!display?.hideChangeButton && (
                <button
                  className={classes.link}
                  onClick={onChangeClick}
                  type='button'
                >
                  <Lang id='form_filler.summary_go_to_correct_page' />
                </button>
              )}
            </Flex>
          </Flex>
        ) : null}
      </Flex>
    </Flex>
  );
});

SummaryComponentInner.displayName = 'SummaryComponentInner';
