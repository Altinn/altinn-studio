import React from 'react';

import { Grid } from '@material-ui/core';
import cn from 'classnames';

import { ErrorPaper } from 'src/components/message/ErrorPaper';
import { useNavigateToNode } from 'src/features/form/layout/NavigateToNode';
import { useSetReturnToView, useSetSummaryNodeOfOrigin } from 'src/features/form/layout/PageNavigationContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import { GenericComponent } from 'src/layout/GenericComponent';
import classes from 'src/layout/Summary/SummaryComponent.module.css';
import { SummaryContent } from 'src/layout/Summary/SummaryContent';
import { pageBreakStyles } from 'src/utils/formComponentUtils';
import { useResolvedNode } from 'src/utils/layout/NodesContext';
import type { IGrid } from 'src/layout/common.generated';
import type { SummaryDisplayProperties } from 'src/layout/Summary/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface ISummaryComponent {
  summaryNode: LayoutNode<'Summary'>;
  overrides?: {
    targetNode?: LayoutNode;
    grid?: IGrid;
    largeGroup?: boolean;
    display?: SummaryDisplayProperties;
  };
}

function _SummaryComponent({ summaryNode, overrides }: ISummaryComponent, ref: React.Ref<HTMLDivElement>) {
  const { id, grid } = summaryNode.item;
  const display = overrides?.display || summaryNode.item.display;
  const { langAsString } = useLanguage();
  const { currentPageId } = useNavigatePage();
  const summaryItem = summaryNode.item;

  const targetNode = useResolvedNode(overrides?.targetNode || summaryNode.item.componentRef || summaryNode.item.id);
  const targetItem = targetNode?.item;
  const targetView = targetNode?.top.top.myKey;

  const validations = useUnifiedValidationsForNode(targetNode);
  const errors = validationsOfSeverity(validations, 'error');

  const navigateTo = useNavigateToNode();
  const setReturnToView = useSetReturnToView();
  const setNodeOfOrigin = useSetSummaryNodeOfOrigin();
  const onChangeClick = async () => {
    if (!targetView) {
      return;
    }

    navigateTo(targetNode, true);
    setReturnToView?.(currentPageId);
    setNodeOfOrigin?.(id);
  };

  if (!targetNode || !targetItem || targetNode.isHidden() || targetItem.type === 'Summary') {
    // TODO: Show info to developers if target node is not found?
    return null;
  }

  const displayGrid =
    display && display.useComponentGrid ? overrides?.grid || targetItem?.grid : overrides?.grid || grid;

  const component = targetNode.def;
  const RenderSummary = 'renderSummary' in component ? component.renderSummary.bind(component) : null;
  const shouldShowBorder =
    RenderSummary && 'renderSummaryBoilerplate' in component && component?.renderSummaryBoilerplate();

  return (
    <Grid
      ref={ref}
      item={true}
      xs={displayGrid?.xs || 12}
      sm={displayGrid?.sm || false}
      md={displayGrid?.md || false}
      lg={displayGrid?.lg || false}
      xl={displayGrid?.xl || false}
      data-testid={`summary-${overrides?.targetNode?.item.id || id}`}
      data-componentid={summaryItem.id}
      data-componentbaseid={summaryItem.baseComponentId || summaryItem.id}
      className={cn(pageBreakStyles(summaryItem.pageBreak ?? targetItem?.pageBreak))}
    >
      <Grid
        container={true}
        className={cn({
          [classes.border]: !display?.hideBottomBorder && shouldShowBorder,
        })}
      >
        {RenderSummary && 'renderSummaryBoilerplate' in component ? (
          <SummaryContent
            onChangeClick={onChangeClick}
            changeText={langAsString('form_filler.summary_item_change')}
            summaryNode={summaryNode}
            targetNode={targetNode}
            overrides={overrides}
            RenderSummary={RenderSummary}
          />
        ) : (
          <GenericComponent node={targetNode} />
        )}
        {errors.length && targetItem.type !== 'Group' && !display?.hideValidationMessages ? (
          <Grid
            container={true}
            style={{ paddingTop: '12px' }}
            spacing={2}
          >
            {errors.map(({ message }) => (
              <ErrorPaper
                key={`key-${message.key}`}
                message={
                  <Lang
                    id={message.key}
                    params={message.params}
                    node={targetNode}
                  />
                }
              />
            ))}
            <Grid
              item={true}
              xs={12}
            >
              {!display?.hideChangeButton && (
                <button
                  className={classes.link}
                  onClick={onChangeClick}
                  type='button'
                >
                  <Lang id={'form_filler.summary_go_to_correct_page'} />
                </button>
              )}
            </Grid>
          </Grid>
        ) : null}
      </Grid>
    </Grid>
  );
}

export const SummaryComponent = React.forwardRef(_SummaryComponent);
