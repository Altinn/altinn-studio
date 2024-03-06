import React from 'react';

import cn from 'classnames';

import { ErrorPaper } from 'src/components/message/ErrorPaper';
import { FD } from 'src/features/formData/FormDataWrite';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useDeepValidationsForNode } from 'src/features/validation/selectors/deepValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { CompCategory } from 'src/layout/common';
import { LargeLikertSummaryContainer } from 'src/layout/Likert/Summary/LargeLikertSummaryContainer';
import classes from 'src/layout/Likert/Summary/LikertSummary.module.css';
import { EditButton } from 'src/layout/Summary/EditButton';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { ITextResourceBindings } from 'src/layout/layout';
import type { ISummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface ILikertSummary {
  changeText: string | null;
  onChangeClick: () => void;
  summaryNode: LayoutNode<'Summary'>;
  targetNode: LayoutNode<'Likert'>;
  overrides?: ISummaryComponent['overrides'];
}

export function LikertSummary({ onChangeClick, changeText, summaryNode, targetNode, overrides }: ILikertSummary) {
  const excludedChildren = summaryNode.item.excludedChildren;
  const display = overrides?.display || summaryNode.item.display;
  const { lang, langAsString } = useLanguage();
  const formDataSelector = FD.useDebouncedSelector();

  const inExcludedChildren = (n: LayoutNode) =>
    excludedChildren &&
    (excludedChildren.includes(n.item.id) || excludedChildren.includes(`${n.item.baseComponentId}`));

  const groupValidations = useDeepValidationsForNode(targetNode);
  const groupHasErrors = hasValidationErrors(groupValidations);

  const textBindings = targetNode.item.textResourceBindings as ITextResourceBindings;
  const summaryAccessibleTitleTrb =
    textBindings && 'summaryAccessibleTitle' in textBindings ? textBindings.summaryAccessibleTitle : undefined;
  const summaryTitleTrb = textBindings && 'summaryTitle' in textBindings ? textBindings.summaryTitle : undefined;
  const titleTrb = textBindings && 'title' in textBindings ? textBindings.title : undefined;
  const title = lang(summaryTitleTrb ?? titleTrb);
  const ariaLabel = langAsString(summaryTitleTrb ?? summaryAccessibleTitleTrb ?? titleTrb);
  const rows = targetNode.item.rows;

  if (summaryNode.item.largeGroup && overrides?.largeGroup !== false && rows.length) {
    return (
      <>
        {rows.map((row) => (
          <LargeLikertSummaryContainer
            key={`summary-${targetNode.item.id}-${row.uuid}`}
            id={`summary-${targetNode.item.id}-${row.index}`}
            groupNode={targetNode}
            onlyInRowUuid={row.uuid}
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
          {rows.length === 0 ? (
            <span className={classes.emptyField}>{lang('general.empty_summary')}</span>
          ) : (
            rows.map((row) => {
              const childSummaryComponents = row.items
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
                      formDataSelector={formDataSelector}
                    />
                  );
                });

              return (
                <div
                  key={`row-${row.uuid}`}
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
                <Lang id={'form_filler.summary_go_to_correct_page'} />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
