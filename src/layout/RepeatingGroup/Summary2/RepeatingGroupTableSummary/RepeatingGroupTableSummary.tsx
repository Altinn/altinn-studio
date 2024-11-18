import React from 'react';

import { ErrorMessage, Table } from '@digdir/designsystemet-react';
import { ExclamationmarkTriangleIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { Caption } from 'src/components/form/caption/Caption';
import { useDisplayDataProps } from 'src/features/displayData/useDisplayData';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { usePdfModeActive } from 'src/features/pdf/PDFWrapper';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { useRepeatingGroupRowState } from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import classes from 'src/layout/RepeatingGroup/Summary2/RepeatingGroupSummary.module.css';
import tableClasses from 'src/layout/RepeatingGroup/Summary2/RepeatingGroupTableSummary/RepeatingGroupTableSummary.module.css';
import { RepeatingGroupTableTitle, useTableTitle } from 'src/layout/RepeatingGroup/Table/RepeatingGroupTableTitle';
import { useTableNodes } from 'src/layout/RepeatingGroup/useTableNodes';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { useColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { ITableColumnFormatting } from 'src/layout/common.generated';
import type { BaseLayoutNode, LayoutNode } from 'src/utils/layout/LayoutNode';

export const RepeatingGroupTableSummary = ({
  componentNode,
  isCompact,
  emptyFieldText,
}: {
  componentNode: BaseLayoutNode<'RepeatingGroup'>;
  isCompact?: boolean;
  emptyFieldText?: string;
}) => {
  const isMobile = useIsMobile();
  const pdfModeActive = usePdfModeActive();
  const isSmall = isMobile && !pdfModeActive;
  const { visibleRows } = useRepeatingGroupRowState();
  const rowsToDisplaySet = new Set(visibleRows.map((row) => row.uuid));
  const rows = useNodeItem(componentNode, (i) => i.rows).filter((row) => row && rowsToDisplaySet.has(row.uuid));
  const validations = useUnifiedValidationsForNode(componentNode);
  const errors = validationsOfSeverity(validations, 'error');
  const title = useNodeItem(componentNode, (i) => i.textResourceBindings?.title);
  const childNodes = useTableNodes(componentNode, 0);
  const { tableColumns } = useNodeItem(componentNode);
  const columnSettings = tableColumns ? structuredClone(tableColumns) : ({} as ITableColumnFormatting);

  if (rows.length === 0) {
    return (
      <SingleValueSummary
        title={title}
        componentNode={componentNode}
        errors={errors}
        isCompact={isCompact}
        emptyFieldText={emptyFieldText}
      />
    );
  }

  return (
    <div
      className={cn(classes.summaryWrapper)}
      data-testid={'summary-repeating-group-component'}
    >
      <Table className={isSmall && tableClasses.mobileTable}>
        <Caption title={<Lang id={title} />} />
        <Table.Head>
          <Table.Row>
            {childNodes.map((childNode) => (
              <HeaderCell
                key={childNode.id}
                node={childNode}
                columnSettings={columnSettings}
              />
            ))}
            {!pdfModeActive && !isSmall && (
              <Table.HeaderCell>
                <span className={tableClasses.visuallyHidden}>
                  <Lang id={'general.edit'} />
                </span>
              </Table.HeaderCell>
            )}
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {rows.map((row) => (
            <Table.Row key={row?.uuid}>
              {childNodes.map((node) => (
                <DataCell
                  node={node}
                  key={node.id}
                />
              ))}
              {!pdfModeActive && (
                <Table.Cell
                  align='right'
                  className={tableClasses.buttonCell}
                >
                  {row?.items && row?.items?.length > 0 && <EditButton componentNode={childNodes[0]} />}
                </Table.Cell>
              )}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      {errors?.map(({ message }) => (
        <ErrorMessage
          key={message.key}
          className={classes.errorMessage}
        >
          <ExclamationmarkTriangleIcon fontSize='1.5rem' />
          <Lang
            id={message.key}
            params={message.params}
            node={componentNode}
          ></Lang>
        </ErrorMessage>
      ))}
    </div>
  );
};

function HeaderCell({ node, columnSettings }: { node: LayoutNode; columnSettings: ITableColumnFormatting }) {
  const style = useColumnStylesRepeatingGroups(node, columnSettings);
  return (
    <Table.HeaderCell
      className={classes.tableCellFormatting}
      style={style}
    >
      <RepeatingGroupTableTitle
        node={node}
        columnSettings={columnSettings}
      />
    </Table.HeaderCell>
  );
}

function DataCell({ node }) {
  const { langAsString } = useLanguage();
  const displayDataProps = useDisplayDataProps();
  const headerTitle = langAsString(useTableTitle(node));
  return (
    <Table.Cell
      key={node.id}
      data-header-title={headerTitle}
    >
      {'getDisplayData' in node.def && node.def.getDisplayData(node as never, displayDataProps)}
    </Table.Cell>
  );
}
