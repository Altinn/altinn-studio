import React from 'react';

import { ErrorPaper } from 'src/components/message/ErrorPaper';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useDeepValidationsForNode } from 'src/features/validation/selectors/deepValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { getComponentDef } from 'src/layout';
import { makeLikertChildId } from 'src/layout/Likert/Generator/makeLikertChildId';
import { useLikertRows } from 'src/layout/Likert/rowUtils';
import { LargeLikertSummaryContainer } from 'src/layout/Likert/Summary/LargeLikertSummaryContainer';
import classes from 'src/layout/Likert/Summary/LikertSummaryComponent.module.css';
import { EditButton } from 'src/layout/Summary/EditButton';
import { SummaryComponentFor } from 'src/layout/Summary/SummaryComponent';
import { DataModelLocationProvider, useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useIsHidden } from 'src/utils/layout/hidden';
import { useDataModelBindingsFor, useExternalItem } from 'src/utils/layout/hooks';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import { typedBoolean } from 'src/utils/typing';
import type { ITextResourceBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { BaseRow } from 'src/utils/layout/types';

export function LikertSummaryComponent({
  onChangeClick,
  changeText,
  targetBaseComponentId,
  overrides,
}: SummaryRendererProps) {
  const targetItem = useItemWhenType(targetBaseComponentId, 'Likert');
  const excludedChildren = overrides?.excludedChildren;
  const display = overrides?.display;
  const { lang, langAsString } = useLanguage();

  const inExcludedChildren = (indexedId: string, baseId: string) =>
    (excludedChildren && (excludedChildren.includes(indexedId) || excludedChildren.includes(baseId))) ?? false;

  const groupValidations = useDeepValidationsForNode(targetBaseComponentId);
  const groupHasErrors = hasValidationErrors(groupValidations);

  const dataModelBindings = useDataModelBindingsFor(targetBaseComponentId, 'Likert');
  const textBindings = targetItem.textResourceBindings as ITextResourceBindings;
  const summaryAccessibleTitleTrb =
    textBindings && 'summaryAccessibleTitle' in textBindings ? textBindings.summaryAccessibleTitle : undefined;
  const summaryTitleTrb = textBindings && 'summaryTitle' in textBindings ? textBindings.summaryTitle : undefined;
  const titleTrb = textBindings && 'title' in textBindings ? textBindings.title : undefined;
  const title = lang(summaryTitleTrb ?? titleTrb);
  const ariaLabel = langAsString(summaryTitleTrb ?? summaryAccessibleTitleTrb ?? titleTrb);
  const indexedId = useIndexedId(targetBaseComponentId);
  const isThisHidden = useIsHidden(targetBaseComponentId);

  const rows = useLikertRows(targetBaseComponentId);
  const largeGroup = overrides?.largeGroup ?? false;

  if (isThisHidden) {
    return null;
  }

  if (largeGroup && rows.length) {
    return (
      <>
        {rows.map((row) => (
          <DataModelLocationProvider
            key={`summary-${indexedId}-${row.uuid}`}
            groupBinding={dataModelBindings.questions}
            rowIndex={row.index}
          >
            <LargeLikertSummaryContainer
              id={`summary-${indexedId}-${row.index}`}
              likertBaseId={targetBaseComponentId}
              renderLayoutComponent={(indexedId, baseId) => {
                if (inExcludedChildren(indexedId, baseId)) {
                  return null;
                }

                return (
                  <SummaryComponentFor
                    targetBaseComponentId={baseId}
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
                groupBinding={dataModelBindings.questions}
                rowIndex={row.index}
              >
                <Row
                  row={row}
                  inExcludedChildren={inExcludedChildren}
                  onChangeClick={onChangeClick}
                  changeText={changeText}
                  targetBaseComponentId={targetBaseComponentId}
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

interface RowProps extends Pick<SummaryRendererProps, 'onChangeClick' | 'changeText' | 'targetBaseComponentId'> {
  row: BaseRow;
  inExcludedChildren: (indexedId: string, baseId: string) => boolean;
}

function Row({ row, inExcludedChildren, onChangeClick, changeText, targetBaseComponentId }: RowProps) {
  const childId = makeLikertChildId(targetBaseComponentId);
  const indexedId = useIndexedId(childId);
  const component = useExternalItem(childId);
  const isHidden = useIsHidden(childId);

  if (inExcludedChildren(indexedId, childId)) {
    return null;
  }
  if (isHidden || component.type !== 'LikertItem') {
    return null;
  }

  const def = getComponentDef(component.type);
  const RenderCompactSummary = def.renderCompactSummary.bind(def);
  return (
    <div
      key={`row-${row.uuid}`}
      className={classes.border}
    >
      <RenderCompactSummary
        onChangeClick={onChangeClick}
        changeText={changeText}
        targetBaseComponentId={childId}
      />
    </div>
  );
}
