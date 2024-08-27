import React from 'react';
import type { JSX } from 'react';

import { Button, Table } from '@digdir/designsystemet-react';
import { Grid } from '@material-ui/core';
import { Delete as DeleteIcon, Edit as EditIcon, ErrorColored as ErrorIcon } from '@navikt/ds-icons';
import cn from 'classnames';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { DeleteWarningPopover } from 'src/features/alertOnChange/DeleteWarningPopover';
import { useAlertOnChange } from 'src/features/alertOnChange/useAlertOnChange';
import { useDisplayDataProps } from 'src/features/displayData/useDisplayData';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useDeepValidationsForNode } from 'src/features/validation/selectors/deepValidationsForNode';
import { useIsMobile } from 'src/hooks/useIsMobile';
import { implementsDisplayData } from 'src/layout';
import { GenericComponent } from 'src/layout/GenericComponent';
import classes from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import { useRepeatingGroup } from 'src/layout/RepeatingGroup/RepeatingGroupContext';
import { useRepeatingGroupsFocusContext } from 'src/layout/RepeatingGroup/RepeatingGroupFocusContext';
import { useTableNodes } from 'src/layout/RepeatingGroup/useTableNodes';
import { useColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { AlertOnChange } from 'src/features/alertOnChange/useAlertOnChange';
import type { DisplayData } from 'src/features/displayData';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { ITableColumnFormatting } from 'src/layout/common.generated';
import type { CompInternal, ITextResourceBindings } from 'src/layout/layout';
import type { CompRepeatingGroupExternal } from 'src/layout/RepeatingGroup/config.generated';
import type { GroupExpressions } from 'src/layout/RepeatingGroup/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { BaseRow } from 'src/utils/layout/types';

export interface IRepeatingGroupTableRowProps {
  className?: string;
  uuid: string;
  index: number;
  mobileView: boolean;
  displayEditColumn: boolean;
  displayDeleteColumn: boolean;
}

function getTableTitle(textResourceBindings: ITextResourceBindings) {
  if (!textResourceBindings) {
    return '';
  }

  if ('tableTitle' in textResourceBindings) {
    return textResourceBindings.tableTitle;
  }

  if ('title' in textResourceBindings) {
    return textResourceBindings.title;
  }

  return '';
}

function getEditButtonText(
  isEditing: boolean,
  langTools: IUseLanguage,
  textResourceBindings: GroupExpressions['textResourceBindings'] | undefined,
) {
  const buttonTextKey = isEditing
    ? textResourceBindings?.edit_button_close
      ? textResourceBindings?.edit_button_close
      : 'general.save_and_close'
    : textResourceBindings?.edit_button_open
      ? textResourceBindings?.edit_button_open
      : 'general.edit_alt';
  return langTools.langAsString(buttonTextKey);
}

function _RepeatingGroupTableRow({
  className,
  uuid,
  index,
  mobileView,
  displayEditColumn,
  displayDeleteColumn,
}: IRepeatingGroupTableRowProps): JSX.Element | null {
  const mobileViewSmall = useIsMobile();
  const { refSetter } = useRepeatingGroupsFocusContext();

  const { node, deleteRow, isEditing, isDeleting, toggleEditing } = useRepeatingGroup();
  const langTools = useLanguage();
  const { langAsString } = langTools;
  const id = node.id;
  const group = useNodeItem(node);
  const row = group.rows.find((r) => r && r.uuid === uuid && r.index === index);
  const rowExpressions = row?.groupExpressions;
  const editForRow = rowExpressions?.edit;
  const editForGroup = group.edit;
  const trbForRow = rowExpressions?.textResourceBindings;
  const columnSettings = group.tableColumns;

  const alertOnDelete = useAlertOnChange(Boolean(editForRow?.alertOnDelete), deleteRow);

  const nodeDataSelector = NodesInternal.useNodeDataSelector();
  const tableNodes = useTableNodes(node, index);
  const displayDataProps = useDisplayDataProps();
  const displayData = tableNodes.map((node) => {
    const def = node.def;
    if (!implementsDisplayData(def)) {
      return '';
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (def as DisplayData<any>).getDisplayData(node, displayDataProps);
  });
  const firstCellData = displayData.find((c) => !!c);
  const isEditingRow = isEditing(uuid);
  const isDeletingRow = isDeleting(uuid);

  // If the row has errors we should highlight the row, unless the errors are for components that are shown in the table,
  // then the component getting highlighted is enough
  const tableEditingNodeIds = tableNodes
    .filter((n) => shouldEditInTable(editForGroup, n, columnSettings))
    .map((n) => n.id);
  const rowValidations = useDeepValidationsForNode(node, true, index);
  const rowHasErrors = rowValidations.some(
    (validation) => validation.severity === 'error' && !tableEditingNodeIds.includes(validation.node.id),
  );

  const editButtonText = rowHasErrors
    ? langAsString('general.edit_alt_error')
    : getEditButtonText(isEditingRow, langTools, trbForRow);

  const deleteButtonText = langAsString('general.delete');

  if (!row) {
    return null;
  }

  return (
    <Table.Row
      className={cn(
        {
          [classes.tableRowError]: rowHasErrors,
        },
        className,
      )}
      data-row-num={index}
      data-row-uuid={uuid}
    >
      {!mobileView ? (
        tableNodes.map((n, idx) =>
          shouldEditInTable(editForGroup, n, columnSettings) ? (
            <Table.Cell
              key={n.id}
              className={classes.tableCell}
            >
              <div ref={(ref) => refSetter && refSetter(index, `component-${n.id}`, ref)}>
                <GenericComponent
                  node={n}
                  overrideDisplay={{
                    renderedInTable: true,
                    renderLabel: false,
                    renderLegend: false,
                  }}
                  overrideItemProps={{
                    grid: {},
                  }}
                />
              </div>
            </Table.Cell>
          ) : (
            <NonEditableCell
              key={n.id}
              node={n}
              isEditingRow={isEditingRow}
              idx={idx}
              displayData={displayData}
              columnSettings={columnSettings}
            />
          ),
        )
      ) : (
        <Table.Cell className={classes.mobileTableCell}>
          <Grid
            container={true}
            spacing={6}
          >
            {tableNodes.map(
              (n, i, { length }) =>
                !isEditingRow &&
                (shouldEditInTable(editForGroup, n, columnSettings) ? (
                  <Grid
                    container={true}
                    item={true}
                    key={n.id}
                    ref={(ref) => refSetter && refSetter(index, `component-${n.id}`, ref)}
                  >
                    <GenericComponent
                      node={n}
                      overrideItemProps={{
                        grid: {},
                      }}
                    />
                  </Grid>
                ) : (
                  <Grid
                    container={true}
                    item={true}
                    key={n.id}
                  >
                    <b className={cn(classes.contentFormatting, classes.spaceAfterContent)}>
                      <Lang
                        id={getTableTitle(
                          nodeDataSelector((picker) => picker(n)?.item?.textResourceBindings ?? {}, [n]),
                        )}
                      />
                      :
                    </b>
                    <span className={classes.contentFormatting}>{displayData[i]}</span>
                    {i < length - 1 && <div style={{ height: 8 }} />}
                  </Grid>
                )),
            )}
          </Grid>
        </Table.Cell>
      )}
      {!mobileView ? (
        <>
          {editForRow?.editButton === false &&
          editForRow?.deleteButton === false &&
          (displayEditColumn || displayDeleteColumn) ? (
            <Table.Cell
              key={`editDelete-${uuid}`}
              colSpan={displayEditColumn && displayDeleteColumn ? 2 : 1}
            />
          ) : null}
          {editForRow?.editButton !== false && displayEditColumn && (
            <Table.Cell
              key={`edit-${uuid}`}
              className={classes.buttonCell}
              colSpan={displayDeleteColumn && editForRow?.deleteButton === false ? 2 : 1}
            >
              <div className={classes.buttonInCellWrapper}>
                <Button
                  aria-expanded={isEditingRow}
                  aria-controls={isEditingRow ? `group-edit-container-${id}-${uuid}` : undefined}
                  variant='tertiary'
                  color='second'
                  size='small'
                  onClick={() => toggleEditing({ index: row.index, uuid: row.uuid })}
                  aria-label={`${editButtonText} ${firstCellData}`}
                  data-testid='edit-button'
                  className={classes.tableButton}
                >
                  {editButtonText}
                  {rowHasErrors ? (
                    <ErrorIcon
                      fontSize='1rem'
                      aria-hidden='true'
                    />
                  ) : (
                    <EditIcon
                      fontSize='1rem'
                      aria-hidden='true'
                    />
                  )}
                </Button>
              </div>
            </Table.Cell>
          )}
          {editForRow?.deleteButton !== false && displayDeleteColumn && (
            <Table.Cell
              key={`delete-${uuid}`}
              className={cn(classes.buttonCell)}
              colSpan={displayEditColumn && editForRow?.editButton === false ? 2 : 1}
            >
              <div className={classes.buttonInCellWrapper}>
                <DeleteElement
                  index={index}
                  uuid={uuid}
                  isDeletingRow={isDeletingRow}
                  editForRow={editForRow}
                  deleteButtonText={deleteButtonText}
                  firstCellData={firstCellData}
                  alertOnDeleteProps={alertOnDelete}
                  langAsString={langAsString}
                >
                  {deleteButtonText}
                </DeleteElement>
              </div>
            </Table.Cell>
          )}
        </>
      ) : (
        <Table.Cell
          className={cn(classes.buttonCell, classes.mobileTableCell)}
          style={{ verticalAlign: 'top' }}
        >
          <div className={classes.buttonInCellWrapper}>
            {editForRow?.editButton !== false && (
              <Button
                aria-expanded={isEditingRow}
                aria-controls={isEditingRow ? `group-edit-container-${id}-${uuid}` : undefined}
                variant='tertiary'
                color='second'
                size='small'
                icon={!isEditingRow && mobileViewSmall}
                onClick={() => toggleEditing({ index, uuid })}
                aria-label={`${editButtonText} ${firstCellData}`}
                data-testid='edit-button'
                className={classes.tableButton}
              >
                {(isEditingRow || !mobileViewSmall) && editButtonText}
                {rowHasErrors ? (
                  <ErrorIcon
                    fontSize='1rem'
                    aria-hidden='true'
                  />
                ) : (
                  <EditIcon
                    fontSize='1rem'
                    aria-hidden='true'
                  />
                )}
              </Button>
            )}
            {editForRow?.deleteButton !== false && (
              <>
                <div style={{ height: 8 }} />
                <DeleteElement
                  index={index}
                  uuid={uuid}
                  isDeletingRow={isDeletingRow}
                  editForRow={editForRow}
                  deleteButtonText={deleteButtonText}
                  firstCellData={firstCellData}
                  alertOnDeleteProps={alertOnDelete}
                  langAsString={langAsString}
                >
                  {isEditingRow || !mobileViewSmall ? deleteButtonText : null}
                </DeleteElement>
              </>
            )}
          </div>
        </Table.Cell>
      )}
    </Table.Row>
  );
}

export const RepeatingGroupTableRow = React.memo(_RepeatingGroupTableRow);
RepeatingGroupTableRow.displayName = 'RepeatingGroupTableRow';

export function shouldEditInTable(
  groupEdit: CompInternal<'RepeatingGroup'>['edit'],
  tableNode: LayoutNode,
  columnSettings: CompRepeatingGroupExternal['tableColumns'],
) {
  const column = columnSettings && columnSettings[tableNode.baseId];
  if (groupEdit?.mode === 'onlyTable' && column?.editInTable !== false) {
    return tableNode.def.canRenderInTable();
  }

  if (column && column.editInTable) {
    return tableNode.def.canRenderInTable();
  }

  return false;
}

function DeleteElement({
  index,
  uuid,
  isDeletingRow,
  editForRow,
  deleteButtonText,
  firstCellData,
  langAsString,
  alertOnDeleteProps: { alertOpen, setAlertOpen, confirmChange, cancelChange, handleChange: handleDelete },
  children,
}: {
  index: number;
  uuid: string;
  isDeletingRow: boolean;
  editForRow: GroupExpressions['edit'];
  deleteButtonText: string;
  firstCellData: string | undefined;
  langAsString: (key: string) => string;
  alertOnDeleteProps: AlertOnChange<(row: BaseRow) => void>;
  children: React.ReactNode;
}) {
  return (
    <ConditionalWrapper
      condition={Boolean(editForRow?.alertOnDelete)}
      wrapper={(children) => (
        <DeleteWarningPopover
          placement='left'
          deleteButtonText={langAsString('group.row_popover_delete_button_confirm')}
          messageText={langAsString('group.row_popover_delete_message')}
          onCancelClick={cancelChange}
          onPopoverDeleteClick={confirmChange}
          open={alertOpen}
          setOpen={setAlertOpen}
        >
          {children}
        </DeleteWarningPopover>
      )}
    >
      <Button
        variant='tertiary'
        color='danger'
        size='small'
        disabled={isDeletingRow}
        onClick={() => handleDelete({ index, uuid })}
        aria-label={`${deleteButtonText}-${firstCellData}`}
        data-testid='delete-button'
        icon={!children}
        className={classes.tableButton}
      >
        {children}
        <DeleteIcon
          fontSize='1rem'
          aria-hidden='true'
        />
      </Button>
    </ConditionalWrapper>
  );
}

function NonEditableCell({
  node,
  columnSettings,
  isEditingRow,
  idx,
  displayData,
}: {
  node: LayoutNode;
  columnSettings: ITableColumnFormatting | undefined;
  idx: number;
  displayData: string[];
  isEditingRow: boolean;
}) {
  const style = useColumnStylesRepeatingGroups(node, columnSettings);
  return (
    <Table.Cell className={classes.tableCell}>
      <span
        className={classes.contentFormatting}
        style={style}
      >
        {isEditingRow ? null : displayData[idx]}
      </span>
    </Table.Cell>
  );
}
