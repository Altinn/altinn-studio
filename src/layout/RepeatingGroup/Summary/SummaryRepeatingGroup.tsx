import React from 'react';

import { ErrorPaper } from 'src/components/message/ErrorPaper';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useDeepValidationsForNode } from 'src/features/validation/selectors/deepValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { getComponentDef } from 'src/layout';
import { CompCategory } from 'src/layout/common';
import { LargeRowSummaryContainer } from 'src/layout/RepeatingGroup/Summary/LargeRowSummaryContainer';
import classes from 'src/layout/RepeatingGroup/Summary/SummaryRepeatingGroup.module.css';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { EditButton } from 'src/layout/Summary/EditButton';
import { SummaryComponentFor } from 'src/layout/Summary/SummaryComponent';
import { DataModelLocationProvider, useComponentIdMutator, useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { Hidden } from 'src/utils/layout/NodesContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import { typedBoolean } from 'src/utils/typing';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { BaseRow } from 'src/utils/layout/types';

interface FullProps extends SummaryRendererProps {
  rows: BaseRow[];
  inExcludedChildren: (indexedId: string, baseId: string) => boolean;
}

interface FullRowProps extends Omit<FullProps, 'rows'> {
  row: BaseRow;
}

export function SummaryRepeatingGroup(props: SummaryRendererProps) {
  const { excludedChildren, largeGroup } = props.overrides ?? {};
  const rows = RepGroupHooks.useVisibleRows(props.targetBaseComponentId);

  const inExcludedChildren = (indexedId: string, baseId: string) =>
    excludedChildren ? excludedChildren.includes(indexedId) || excludedChildren.includes(baseId) : false;

  if (largeGroup && props.overrides?.largeGroup !== false && rows.length) {
    return (
      <LargeRepeatingGroup
        {...props}
        rows={rows}
        inExcludedChildren={inExcludedChildren}
      />
    );
  }

  return (
    <RegularRepeatingGroup
      {...props}
      rows={rows}
      inExcludedChildren={inExcludedChildren}
    />
  );
}

function RegularRepeatingGroup(props: FullProps) {
  const { onChangeClick, changeText, targetBaseComponentId, overrides, rows: _rows } = props;
  const rows = _rows.filter(typedBoolean);
  const { textResourceBindings: trb } = useItemWhenType(targetBaseComponentId, 'RepeatingGroup');
  const display = overrides?.display;
  const { langAsString } = useLanguage();

  const dataModelBindings = useDataModelBindingsFor(targetBaseComponentId, 'RepeatingGroup');
  const groupValidations = useDeepValidationsForNode(targetBaseComponentId);
  const groupHasErrors = hasValidationErrors(groupValidations);

  const summaryAccessibleTitleTrb = trb && 'summaryAccessibleTitle' in trb ? trb.summaryAccessibleTitle : undefined;
  const summaryTitleTrb = trb && 'summaryTitle' in trb ? trb.summaryTitle : undefined;
  const titleTrb = trb && 'title' in trb ? trb.title : undefined;
  const ariaLabel = langAsString(summaryTitleTrb ?? summaryAccessibleTitleTrb ?? titleTrb);

  return (
    <>
      <div
        data-testid='summary-group-component'
        style={{ width: '100%' }}
      >
        <div className={classes.container}>
          <span className={classes.label}>
            <Lang id={summaryTitleTrb ?? titleTrb} />
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
            <span className={classes.emptyField}>
              <Lang id='general.empty_summary' />
            </span>
          ) : (
            rows.map((row) => (
              <DataModelLocationProvider
                key={`row-${row.uuid}`}
                groupBinding={dataModelBindings.group}
                rowIndex={row.index}
              >
                <RegularRepeatingGroupRow
                  {...props}
                  row={row}
                />
              </DataModelLocationProvider>
            ))
          )}
        </div>
      </div>

      {groupHasErrors && !display?.hideValidationMessages && (
        <div className={classes.gridStyle}>
          <ErrorPaper message={<Lang id='group.row_error' />} />
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

function RegularRepeatingGroupRow({
  targetBaseComponentId,
  inExcludedChildren,
  row,
  onChangeClick,
  changeText,
}: FullRowProps) {
  const isHidden = Hidden.useIsHiddenSelector();
  const children = RepGroupHooks.useChildIds(targetBaseComponentId);
  const idMutator = useComponentIdMutator();
  const layoutLookups = useLayoutLookups();

  const childSummaryComponents = children
    .filter((id) => !inExcludedChildren(idMutator(id), id))
    .map((id) => {
      const component = layoutLookups.getComponent(id);
      const def = getComponentDef(component.type);
      if (!isHidden(idMutator(id), 'node') && def.category === CompCategory.Form) {
        return { component: def.renderCompactSummary.bind(def), id };
      }
    })
    .filter(typedBoolean);

  return (
    <div
      key={`row-${row.uuid}`}
      data-testid='summary-repeating-row'
      className={classes.border}
    >
      {childSummaryComponents.map(({ component: RenderCompactSummary, id }) => (
        <RenderCompactSummary
          onChangeClick={onChangeClick}
          changeText={changeText}
          key={id}
          targetBaseComponentId={id}
          overrides={{}}
        />
      ))}
    </div>
  );
}

function LargeRepeatingGroup({ targetBaseComponentId, overrides, inExcludedChildren, rows }: FullProps) {
  const groupBinding = useDataModelBindingsFor(targetBaseComponentId, 'RepeatingGroup').group;
  const indexedId = useIndexedId(targetBaseComponentId);
  const isHidden = Hidden.useIsHidden(indexedId, 'node');

  if (isHidden) {
    return null;
  }

  return (
    <>
      {rows.filter(typedBoolean).map((row) => (
        <DataModelLocationProvider
          key={`summary-${targetBaseComponentId}-${row.uuid}`}
          groupBinding={groupBinding}
          rowIndex={row.index}
        >
          <LargeRowSummaryContainer
            id={`summary-${targetBaseComponentId}-${row.index}`}
            baseComponentId={targetBaseComponentId}
            inExcludedChildren={inExcludedChildren}
            renderLayoutComponent={(baseId) => (
              <SummaryComponentFor
                key={baseId}
                targetBaseComponentId={baseId}
                overrides={{
                  ...overrides,
                  grid: {},
                  largeGroup: false,
                }}
              />
            )}
          />
        </DataModelLocationProvider>
      ))}
    </>
  );
}
