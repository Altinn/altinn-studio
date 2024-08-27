import React from 'react';

import { ErrorPaper } from 'src/components/message/ErrorPaper';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useDeepValidationsForNode } from 'src/features/validation/selectors/deepValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { CompCategory } from 'src/layout/common';
import { LargeLikertSummaryContainer } from 'src/layout/Likert/Summary/LargeLikertSummaryContainer';
import classes from 'src/layout/Likert/Summary/LikertSummary.module.css';
import { EditButton } from 'src/layout/Summary/EditButton';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import { Hidden } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { typedBoolean } from 'src/utils/typing';
import type { ITextResourceBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function LikertSummary({
  onChangeClick,
  changeText,
  summaryNode,
  targetNode,
  overrides,
}: SummaryRendererProps<'Likert'>) {
  const targetItem = useNodeItem(targetNode);
  const summaryItem = useNodeItem(summaryNode);
  const excludedChildren = summaryItem?.excludedChildren;
  const display = overrides?.display || summaryItem?.display;
  const { lang, langAsString } = useLanguage();
  const isHidden = Hidden.useIsHiddenSelector();

  const inExcludedChildren = (n: LayoutNode) =>
    excludedChildren && (excludedChildren.includes(n.id) || excludedChildren.includes(n.baseId));

  const groupValidations = useDeepValidationsForNode(targetNode);
  const groupHasErrors = hasValidationErrors(groupValidations);

  const textBindings = targetItem.textResourceBindings as ITextResourceBindings;
  const summaryAccessibleTitleTrb =
    textBindings && 'summaryAccessibleTitle' in textBindings ? textBindings.summaryAccessibleTitle : undefined;
  const summaryTitleTrb = textBindings && 'summaryTitle' in textBindings ? textBindings.summaryTitle : undefined;
  const titleTrb = textBindings && 'title' in textBindings ? textBindings.title : undefined;
  const title = lang(summaryTitleTrb ?? titleTrb);
  const ariaLabel = langAsString(summaryTitleTrb ?? summaryAccessibleTitleTrb ?? titleTrb);

  const rows = targetItem.rows;
  const largeGroup = overrides?.largeGroup ?? summaryItem?.largeGroup ?? false;
  if (largeGroup && rows.length) {
    return (
      <>
        {rows.filter(typedBoolean).map((row) => (
          <LargeLikertSummaryContainer
            key={`summary-${targetNode.id}-${row.uuid}`}
            id={`summary-${targetNode.id}-${row.index}`}
            groupNode={targetNode}
            restriction={row.index}
            renderLayoutNode={(n) => {
              if (inExcludedChildren(n) || isHidden(n)) {
                return null;
              }

              return (
                <SummaryComponent
                  key={n.id}
                  summaryNode={summaryNode}
                  overrides={{
                    ...overrides,
                    targetNode: n,
                    grid: {},
                    largeGroup: false,
                  }}
                />
              );
            }}
          />
        ))}
      </>
    );
  }

  return (
    <>
      <div
        data-testid={'summary-group-component'}
        style={{ width: '100%' }}
      >
        <div className={classes.container}>
          <span className={classes.label}>{title}</span>

          {!display?.hideChangeButton ? (
            <EditButton
              onClick={onChangeClick}
              editText={changeText}
              label={ariaLabel}
            />
          ) : null}
        </div>
        <div style={{ width: '100%' }}>
          {rows.length === 0 ? (
            <span className={classes.emptyField}>{lang('general.empty_summary')}</span>
          ) : (
            rows.filter(typedBoolean).map((row) => {
              if (!row.itemNode || inExcludedChildren(row.itemNode)) {
                return null;
              }
              if (isHidden(row.itemNode) || !row.itemNode.isCategory(CompCategory.Form)) {
                return null;
              }

              const RenderCompactSummary = row.itemNode.def.renderCompactSummary.bind(row.itemNode.def);
              return (
                <div
                  key={`row-${row.uuid}`}
                  className={classes.border}
                >
                  <RenderCompactSummary
                    onChangeClick={onChangeClick}
                    changeText={changeText}
                    key={row.itemNode.id}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    targetNode={row.itemNode as any}
                    summaryNode={summaryNode}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {groupHasErrors && !display?.hideValidationMessages && (
        <div className={classes.gridStyle}>
          <ErrorPaper message={langAsString('group.row_error')} />
          <div>
            {!display?.hideChangeButton && (
              <button
                className={classes.link}
                onClick={onChangeClick}
                type='button'
              >
                <Lang id={'form_filler.summary_go_to_correct_page'} />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
