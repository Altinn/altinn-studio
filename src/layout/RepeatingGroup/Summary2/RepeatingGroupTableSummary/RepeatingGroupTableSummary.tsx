import React from 'react';

import { Table, ValidationMessage } from '@digdir/designsystemet-react';
import { ExclamationmarkTriangleIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { Caption } from 'src/components/form/caption/Caption';
import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { useIndexedComponentIds } from 'src/features/form/layout/utils/makeIndexedId';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { usePdfModeActive } from 'src/features/pdf/PDFWrapper';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import repeatingGroupClasses from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import classes from 'src/layout/RepeatingGroup/Summary2/RepeatingGroupSummary.module.css';
import tableClasses from 'src/layout/RepeatingGroup/Summary2/RepeatingGroupTableSummary/RepeatingGroupTableSummary.module.css';
import { RepeatingGroupTableTitle, useTableTitle } from 'src/layout/RepeatingGroup/Table/RepeatingGroupTableTitle';
import { useTableComponentIds } from 'src/layout/RepeatingGroup/useTableComponentIds';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { EditButtonFirstVisible } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import { useReportSummaryRender } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import { ComponentSummaryById, SummaryContains } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import utilClasses from 'src/styles/utils.module.css';
import { useColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import { DataModelLocationProvider } from 'src/utils/layout/DataModelLocation';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useNode } from 'src/utils/layout/NodesContext';
import { useItemFor, useItemWhenType, useNodeDirectChildren } from 'src/utils/layout/useNodeItem';
import type { ITableColumnFormatting } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { BaseRow } from 'src/utils/layout/types';

export const RepeatingGroupTableSummary = ({ componentNode }: { componentNode: LayoutNode<'RepeatingGroup'> }) => {
  const isMobile = useIsMobile();
  const pdfModeActive = usePdfModeActive();
  const isSmall = isMobile && !pdfModeActive;
  const rows = RepGroupHooks.useVisibleRows(componentNode);
  const validations = useUnifiedValidationsForNode(componentNode);
  const errors = validationsOfSeverity(validations, 'error');
  const { textResourceBindings, dataModelBindings, tableColumns } = useItemWhenType(
    componentNode.baseId,
    'RepeatingGroup',
  );
  const title = textResourceBindings?.title;
  const tableIds = useTableComponentIds(componentNode);
  const columnSettings = tableColumns ? structuredClone(tableColumns) : ({} as ITableColumnFormatting);

  return (
    <div
      className={cn(classes.summaryWrapper)}
      data-testid='summary-repeating-group-component'
    >
      <Table className={cn({ [tableClasses.mobileTable]: isSmall })}>
        <Caption title={<Lang id={title} />} />
        <Table.Head>
          <Table.Row>
            <DataModelLocationProvider
              groupBinding={dataModelBindings.group}
              rowIndex={0} // Force the header row to show texts as if it is in the first row
            >
              {tableIds.map((id) => (
                <HeaderCell
                  key={id}
                  baseComponentId={id}
                  columnSettings={columnSettings}
                />
              ))}
            </DataModelLocationProvider>
            {!pdfModeActive && !isSmall && (
              <Table.HeaderCell className={tableClasses.narrowLastColumn}>
                <span className={utilClasses.visuallyHidden}>
                  <Lang id='general.edit' />
                </span>
              </Table.HeaderCell>
            )}
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {rows.map((row, index) => (
            <DataModelLocationProvider
              groupBinding={dataModelBindings.group}
              rowIndex={row?.index ?? index}
              key={`${row?.uuid}-${index}`}
            >
              <DataRow
                row={row}
                node={componentNode}
                pdfModeActive={pdfModeActive}
                columnSettings={columnSettings}
              />
            </DataModelLocationProvider>
          ))}
        </Table.Body>
      </Table>
      {errors?.map(({ message }) => (
        <ValidationMessage
          key={message.key}
          data-size='sm'
          className={classes.errorMessage}
        >
          <ExclamationmarkTriangleIcon fontSize='1.5rem' />
          <Lang
            id={message.key}
            params={message.params}
          />
        </ValidationMessage>
      ))}
    </div>
  );
};

function HeaderCell({
  baseComponentId,
  columnSettings,
}: {
  baseComponentId: string;
  columnSettings: ITableColumnFormatting;
}) {
  const style = useColumnStylesRepeatingGroups(baseComponentId, columnSettings);
  return (
    <Table.HeaderCell style={style}>
      <RepeatingGroupTableTitle
        baseComponentId={baseComponentId}
        columnSettings={columnSettings}
      />
    </Table.HeaderCell>
  );
}

type DataRowProps = {
  row: BaseRow | undefined;
  node: LayoutNode<'RepeatingGroup'>;
  pdfModeActive: boolean;
  columnSettings: ITableColumnFormatting;
};

function DataRow({ row, node, pdfModeActive, columnSettings }: DataRowProps) {
  const layoutLookups = useLayoutLookups();
  const rawIds = useTableComponentIds(node);
  const indexedIds = useIndexedComponentIds(rawIds);
  const otherChildren = useNodeDirectChildren(node, row?.index)?.map((n) => n.id);
  const dataModelBindings = useDataModelBindingsFor(node.baseId, 'RepeatingGroup');

  if (!row) {
    return null;
  }

  return (
    <DataModelLocationProvider
      groupBinding={dataModelBindings.group}
      rowIndex={row.index}
    >
      <Table.Row>
        {indexedIds.map((id, index) =>
          layoutLookups.getComponent(rawIds[index]).type === 'Custom' ? (
            <Table.Cell key={id}>
              <ComponentSummaryById componentId={id} />
            </Table.Cell>
          ) : (
            <DataCell
              key={id}
              nodeId={id}
              columnSettings={columnSettings}
            />
          ),
        )}
        {!pdfModeActive && (
          <Table.Cell
            align='right'
            className={tableClasses.buttonCell}
          >
            <EditButtonFirstVisible ids={[...indexedIds, ...otherChildren, node.id]} />
          </Table.Cell>
        )}
      </Table.Row>
    </DataModelLocationProvider>
  );
}

type DataCellProps = {
  nodeId: string;
  columnSettings: ITableColumnFormatting;
};

function DataCell({ nodeId, columnSettings }: DataCellProps) {
  const node = useNode(nodeId);
  if (!node) {
    return null;
  }

  return (
    <NodeDataCell
      node={node}
      columnSettings={columnSettings}
    />
  );
}

function NodeDataCell({ node, columnSettings }: { node: LayoutNode } & Pick<DataCellProps, 'columnSettings'>) {
  const { langAsString } = useLanguage();
  const headerTitle = langAsString(useTableTitle(node.baseId));
  const style = useColumnStylesRepeatingGroups(node.baseId, columnSettings);
  const displayData = useDisplayData(node);
  const item = useItemFor(node.baseId);
  const required = 'required' in item ? item.required : false;

  useReportSummaryRender(
    displayData.trim() === ''
      ? required
        ? SummaryContains.EmptyValueRequired
        : SummaryContains.EmptyValueNotRequired
      : SummaryContains.SomeUserContent,
  );

  return (
    <Table.Cell
      key={node.id}
      data-header-title={headerTitle}
    >
      <span
        className={repeatingGroupClasses.contentFormatting}
        style={style}
      >
        {displayData}
      </span>
    </Table.Cell>
  );
}
