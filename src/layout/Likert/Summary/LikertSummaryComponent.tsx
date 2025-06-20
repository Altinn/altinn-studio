import React from 'react';

import { ErrorPaper } from 'src/components/message/ErrorPaper';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useDeepValidationsForNode } from 'src/features/validation/selectors/deepValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { CompCategory } from 'src/layout/common';
import { makeLikertChildId } from 'src/layout/Likert/Generator/makeLikertChildId';
import { useLikertRows } from 'src/layout/Likert/rowUtils';
import { LargeLikertSummaryContainer } from 'src/layout/Likert/Summary/LargeLikertSummaryContainer';
import classes from 'src/layout/Likert/Summary/LikertSummaryComponent.module.css';
import { EditButton } from 'src/layout/Summary/EditButton';
import { SummaryComponentFor } from 'src/layout/Summary/SummaryComponent';
import { DataModelLocationProvider } from 'src/utils/layout/DataModelLocation';
import { Hidden, useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { typedBoolean } from 'src/utils/typing';
import type { ITextResourceBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { BaseRow } from 'src/utils/layout/types';

export function LikertSummaryComponent({
  onChangeClick,
  changeText,
  targetNode,
  overrides,
}: SummaryRendererProps<'Likert'>) {
  const targetItem = useNodeItem(targetNode);
  const excludedChildren = overrides?.excludedChildren;
  const display = overrides?.display;
  const { lang, langAsString } = useLanguage();
  const isHidden = Hidden.useIsHiddenSelector();

  const inExcludedChildren = (n: LayoutNode) =>
    (excludedChildren && (excludedChildren.includes(n.id) || excludedChildren.includes(n.baseId))) ?? false;

  const groupValidations = useDeepValidationsForNode(targetNode);
  const groupHasErrors = hasValidationErrors(groupValidations);

  const groupBinding = useNodeItem(targetNode, (i) => i.dataModelBindings.questions);
  const textBindings = targetItem.textResourceBindings as ITextResourceBindings;
  const summaryAccessibleTitleTrb =
    textBindings && 'summaryAccessibleTitle' in textBindings ? textBindings.summaryAccessibleTitle : undefined;
  const summaryTitleTrb = textBindings && 'summaryTitle' in textBindings ? textBindings.summaryTitle : undefined;
  const titleTrb = textBindings && 'title' in textBindings ? textBindings.title : undefined;
  const title = lang(summaryTitleTrb ?? titleTrb);
  const ariaLabel = langAsString(summaryTitleTrb ?? summaryAccessibleTitleTrb ?? titleTrb);

  const rows = useLikertRows(targetNode);
  const largeGroup = overrides?.largeGroup ?? false;
  if (largeGroup && rows.length) {
    return (
      <>
        {rows.map((row) => (
          <DataModelLocationProvider
            key={`summary-${targetNode.id}-${row.uuid}`}
            groupBinding={groupBinding}
            rowIndex={row.index}
          >
            <LargeLikertSummaryContainer
              id={`summary-${targetNode.id}-${row.index}`}
              groupNode={targetNode}
              restriction={row.index}
              renderLayoutNode={(n) => {
                if (inExcludedChildren(n) || isHidden(n)) {
                  return null;
                }

                return (
                  <SummaryComponentFor
                    key={n.id}
                    targetNode={n}
                    overrides={{
                      ...overrides,
                      grid: {},
                      largeGroup: false,
                    }}
                  />
                );
              }}
            />
          </DataModelLocationProvider>
        ))}
      </>
    );
  }

  return (
    <>
      <div
        data-testid='summary-group-component'
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
            rows.filter(typedBoolean).map((row) => (
              <DataModelLocationProvider
                key={row.index}
                groupBinding={groupBinding}
                rowIndex={row.index}
              >
                <Row
                  row={row}
                  inExcludedChildren={inExcludedChildren}
                  onChangeClick={onChangeClick}
                  changeText={changeText}
                  targetNode={targetNode}
                />
              </DataModelLocationProvider>
            ))
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
                <Lang id='form_filler.summary_go_to_correct_page' />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

interface RowProps extends Pick<SummaryRendererProps<'Likert'>, 'onChangeClick' | 'changeText' | 'targetNode'> {
  row: BaseRow;
  inExcludedChildren: (n: LayoutNode) => boolean;
}

function Row({ row, inExcludedChildren, onChangeClick, changeText, targetNode }: RowProps) {
  const isHidden = Hidden.useIsHiddenSelector();
  const childId = makeLikertChildId(targetNode.id, row.index);
  const node = useNode(childId) as LayoutNode<'LikertItem'> | undefined;

  if (!node || inExcludedChildren(node)) {
    return null;
  }
  if (isHidden(node) || !node.isCategory(CompCategory.Form)) {
    return null;
  }

  const RenderCompactSummary = node.def.renderCompactSummary.bind(node.def);
  return (
    <div
      key={`row-${row.uuid}`}
      className={classes.border}
    >
      <RenderCompactSummary
        onChangeClick={onChangeClick}
        changeText={changeText}
        key={node.id}
        targetNode={node}
      />
    </div>
  );
}
