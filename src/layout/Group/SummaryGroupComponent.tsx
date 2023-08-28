import React from 'react';

import cn from 'classnames';

import { ErrorPaper } from 'src/components/message/ErrorPaper';
import { useLanguage } from 'src/hooks/useLanguage';
import { CompCategory } from 'src/layout/common';
import { DisplayGroupContainer } from 'src/layout/Group/DisplayGroupContainer';
import classes from 'src/layout/Group/SummaryGroupComponent.module.css';
import { EditButton } from 'src/layout/Summary/EditButton';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type {
  CompGroupNonRepeatingInternal,
  CompGroupNonRepeatingPanelInternal,
} from 'src/layout/Group/config.generated';
import type { LayoutNodeForGroup } from 'src/layout/Group/LayoutNodeForGroup';
import type { ITextResourceBindings } from 'src/layout/layout';
import type { ISummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface ISummaryGroupComponent {
  changeText: string | null;
  onChangeClick: () => void;
  summaryNode: LayoutNode<'Summary'>;
  targetNode: LayoutNode<'Group'>;
  overrides?: ISummaryComponent['overrides'];
}

export function SummaryGroupComponent({
  onChangeClick,
  changeText,
  summaryNode,
  targetNode,
  overrides,
}: ISummaryGroupComponent) {
  const excludedChildren = summaryNode.item.excludedChildren;
  const display = overrides?.display || summaryNode.item.display;
  const { lang, langAsString } = useLanguage();

  const inExcludedChildren = (n: LayoutNode) =>
    excludedChildren &&
    (excludedChildren.includes(n.item.id) || excludedChildren.includes(`${n.item.baseComponentId}`));

  const groupHasErrors = targetNode.hasDeepValidationMessages();

  const textBindings = targetNode.item.textResourceBindings as ITextResourceBindings;
  const summaryAccessibleTitleTrb =
    textBindings && 'summaryAccessibleTitle' in textBindings ? textBindings.summaryAccessibleTitle : undefined;
  const summaryTitleTrb = textBindings && 'summaryTitle' in textBindings ? textBindings.summaryTitle : undefined;
  const titleTrb = textBindings && 'title' in textBindings ? textBindings.title : undefined;
  const title = lang(summaryTitleTrb ?? titleTrb);
  const ariaLabel = langAsString(summaryAccessibleTitleTrb ?? summaryTitleTrb ?? titleTrb);

  const rowIndexes: (number | undefined)[] = [];
  if (targetNode.isRepGroup()) {
    for (const row of targetNode.item.rows) {
      row && rowIndexes.push(row.index);
    }
  } else {
    // This trick makes non-repeating groups work in Summary as well. They don't have any rows, but if we add this
    // to rowIndexes we'll make our later code call groupNode.children() once with rowIndex `undefined`, which retrieves
    // all the non-repeating children and renders a group summary as if it was a repeating group with one row.
    rowIndexes.push(undefined);
  }

  if (summaryNode.item.largeGroup && overrides?.largeGroup !== false && rowIndexes.length) {
    return (
      <>
        {rowIndexes.map((idx) => {
          if (idx !== undefined && targetNode.isRepGroup() && targetNode.item.rows[idx]?.groupExpressions?.hiddenRow) {
            return null;
          }

          return (
            <DisplayGroupContainer
              key={`summary-${targetNode.item.id}-${idx}`}
              id={`summary-${targetNode.item.id}-${idx}`}
              groupNode={
                targetNode as LayoutNodeForGroup<CompGroupNonRepeatingInternal | CompGroupNonRepeatingPanelInternal>
              }
              onlyRowIndex={idx}
              renderLayoutNode={(n) => {
                if (inExcludedChildren(n) || n.isHidden()) {
                  return null;
                }

                return (
                  <SummaryComponent
                    key={n.item.id}
                    summaryNode={summaryNode}
                    overrides={{
                      ...overrides,
                      targetNode: n,
                      grid: {},
                      largeGroup: targetNode.isNonRepGroup(),
                    }}
                  />
                );
              }}
            />
          );
        })}
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
          <span
            className={cn(classes.label, groupHasErrors && !display?.hideValidationMessages && classes.labelWithError)}
          >
            {title}
          </span>

          {!display?.hideChangeButton ? (
            <EditButton
              onClick={onChangeClick}
              editText={changeText}
              label={ariaLabel}
            />
          ) : null}
        </div>
        <div style={{ width: '100%' }}>
          {rowIndexes.length === 0 ? (
            <span className={classes.emptyField}>{lang('general.empty_summary')}</span>
          ) : (
            rowIndexes.map((idx) => {
              const childSummaryComponents = targetNode
                .children(undefined, idx)
                .filter((n) => !inExcludedChildren(n))
                .map((child) => {
                  if (child.isHidden() || !child.isCategory(CompCategory.Form)) {
                    return;
                  }
                  const RenderCompactSummary = child.def.renderCompactSummary.bind(child.def);
                  return (
                    <RenderCompactSummary
                      onChangeClick={onChangeClick}
                      changeText={changeText}
                      key={child.item.id}
                      targetNode={child as any}
                      summaryNode={summaryNode}
                      overrides={{}}
                    />
                  );
                });

              return (
                <div
                  key={`row-${idx}`}
                  className={classes.border}
                >
                  {childSummaryComponents}
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
                {lang('form_filler.summary_go_to_correct_page')}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
