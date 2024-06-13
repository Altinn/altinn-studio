import React from 'react';

import { Button, Table } from '@digdir/designsystemet-react';
import { Grid } from '@material-ui/core';
import { Delete as DeleteIcon, Edit as EditIcon, ErrorColored as ErrorIcon } from '@navikt/ds-icons';
import cn from 'classnames';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { DeleteWarningPopover } from 'src/components/molecules/DeleteWarningPopover';
import { useDisplayDataProps } from 'src/features/displayData/useDisplayData';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useDeepValidationsForNode } from 'src/features/validation/selectors/deepValidationsForNode';
import { useAlertOnChange } from 'src/hooks/useAlertOnChange';
import { useIsMobile } from 'src/hooks/useIsMobile';
import { implementsDisplayData } from 'src/layout';
import { GenericComponent } from 'src/layout/GenericComponent';
import classes from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import { useRepeatingGroup } from 'src/layout/RepeatingGroup/RepeatingGroupContext';
import { useRepeatingGroupsFocusContext } from 'src/layout/RepeatingGroup/RepeatingGroupFocusContext';
import { getColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { AlertOnChange } from 'src/hooks/useAlertOnChange';
import type { ITextResourceBindings } from 'src/layout/layout';
import type {
  CompRepeatingGroupExternal,
  CompRepeatingGroupInternal,
  IGroupEditPropertiesInternal,
} from 'src/layout/RepeatingGroup/config.generated';
import type { ChildLookupRestriction } from 'src/utils/layout/HierarchyGenerator';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface IRepeatingGroupTableRowProps {
  className?: string;
  uuid: string;
  getTableNodes: (restriction: ChildLookupRestriction) => LayoutNode[] | undefined;
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
  textResourceBindings: CompRepeatingGroupInternal['textResourceBindings'] | undefined,
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

export function RepeatingGroupTableRow({
  className,
  uuid,
  getTableNodes,
  mobileView,
  displayEditColumn,
  displayDeleteColumn,
}: IRepeatingGroupTableRowProps): JSX.Element | null {
  const mobileViewSmall = useIsMobile();
  const { refSetter } = useRepeatingGroupsFocusContext();

  const { node, deleteRow, isEditing, isDeleting, toggleEditing } = useRepeatingGroup();
  const langTools = useLanguage();
  const { langAsString } = langTools;
  const id = node.item.id;
  const group = node.item;
  const row = group.rows.find((r) => r.uuid === uuid);
  const expressionsForRow = row?.groupExpressions;
  const columnSettings = group.tableColumns;
  const edit = {
    ...group.edit,
    ...expressionsForRow?.edit,
  } as IGroupEditPropertiesInternal;
  const resolvedTextBindings = {
    ...group.textResourceBindings,
    ...expressionsForRow?.textResourceBindings,
  } as CompRepeatingGroupInternal['textResourceBindings'];

  const alertOnDelete = useAlertOnChange(Boolean(edit?.alertOnDelete), deleteRow);

  const tableNodes = getTableNodes({ onlyInRowUuid: uuid }) || [];
  const displayDataProps = useDisplayDataProps();
  const displayData = tableNodes.map((node) =>
    implementsDisplayData(node.def) ? node.def.getDisplayData(node as any, displayDataProps) : '',
  );
  const firstCellData = displayData.find((c) => !!c);
  const isEditingRow = isEditing(uuid);
  const isDeletingRow = isDeleting(uuid);

  // If the row has errors we should highlight the row, unless the errors are for components that are shown in the table,
  // then the component getting highlighted is enough
  const tableEditingNodeIds = tableNodes
    .filter((n) => shouldEditInTable(edit, n, columnSettings))
    .map((n) => n.item.id);
  const rowValidations = useDeepValidationsForNode(node, true, uuid);
  const rowHasErrors = rowValidations.some(
    (validation) => validation.severity === 'error' && !tableEditingNodeIds.includes(validation.componentId),
  );

  const editButtonText = rowHasErrors
    ? langAsString('general.edit_alt_error')
    : getEditButtonText(isEditingRow, langTools, resolvedTextBindings);

  const deleteButtonText = langAsString('general.delete');

  if (!row) {
    return null;
  }

  return (
    <Table.Row
      key={`repeating-group-row-${uuid}`}
      className={cn(
        {
          [classes.tableRowError]: rowHasErrors,
        },
        className,
      )}
      data-row-num={row.index}
    >
      {!mobileView ? (
        tableNodes.map((n, idx) =>
          shouldEditInTable(edit, n, columnSettings) ? (
            <Table.Cell
              key={n.item.id}
              className={classes.tableCell}
            >
              <div ref={(ref) => refSetter && refSetter(row.index, `component-${n.item.id}`, ref)}>
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
            <Table.Cell
              key={`${n.item.id}-${row.index}`}
              className={classes.tableCell}
            >
              <span
                className={classes.contentFormatting}
                style={getColumnStylesRepeatingGroups(n, columnSettings)}
              >
                {isEditingRow ? null : displayData[idx]}
              </span>
            </Table.Cell>
          ),
        )
      ) : (
        <Table.Cell className={classes.mobileTableCell}>
          <Grid
            container={true}
            spacing={3}
          >
            {tableNodes.map(
              (n, i, { length }) =>
                !isEditingRow &&
                (shouldEditInTable(edit, n, columnSettings) ? (
                  <Grid
                    container={true}
                    item={true}
                    key={n.item.id}
                    ref={(ref) => refSetter && refSetter(row.index, `component-${n.item.id}`, ref)}
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
                    key={n.item.id}
                  >
                    <b className={cn(classes.contentFormatting, classes.spaceAfterContent)}>
                      <Lang id={getTableTitle('textResourceBindings' in n.item ? n.item.textResourceBindings : {})} />:
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
          {edit?.editButton === false && edit?.deleteButton === false && (displayEditColumn || displayDeleteColumn) ? (
            <Table.Cell
              key={`editDelete-${uuid}`}
              colSpan={displayEditColumn && displayDeleteColumn ? 2 : 1}
            />
          ) : null}
          {edit?.editButton !== false && displayEditColumn && (
            <Table.Cell
              key={`edit-${uuid}`}
              className={classes.buttonCell}
              colSpan={displayDeleteColumn && edit?.deleteButton === false ? 2 : 1}
            >
              <div className={classes.buttonInCellWrapper}>
                <Button
                  aria-expanded={isEditingRow}
                  aria-controls={isEditingRow ? `group-edit-container-${id}-${uuid}` : undefined}
                  variant='tertiary'
                  color='second'
                  size='small'
                  onClick={() => toggleEditing(uuid)}
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
          {edit?.deleteButton !== false && displayDeleteColumn && (
            <Table.Cell
              key={`delete-${uuid}`}
              className={cn(classes.buttonCell)}
              colSpan={displayEditColumn && edit?.editButton === false ? 2 : 1}
            >
              <div className={classes.buttonInCellWrapper}>
                <DeleteElement
                  uuid={uuid}
                  isDeletingRow={isDeletingRow}
                  edit={edit}
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
            {edit?.editButton !== false && (
              <Button
                aria-expanded={isEditingRow}
                aria-controls={isEditingRow ? `group-edit-container-${id}-${uuid}` : undefined}
                variant='tertiary'
                color='second'
                size='small'
                icon={!isEditingRow && mobileViewSmall}
                onClick={() => toggleEditing(uuid)}
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
            {edit?.deleteButton !== false && (
              <>
                <div style={{ height: 8 }} />
                <DeleteElement
                  uuid={uuid}
                  isDeletingRow={isDeletingRow}
                  edit={edit}
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

export function shouldEditInTable(
  groupEdit: IGroupEditPropertiesInternal,
  tableNode: LayoutNode,
  columnSettings: CompRepeatingGroupExternal['tableColumns'],
) {
  const column = columnSettings && columnSettings[tableNode.item.baseComponentId || tableNode.item.id];
  if (groupEdit?.mode === 'onlyTable' && column?.editInTable !== false) {
    return tableNode.def.canRenderInTable();
  }

  if (column && column.editInTable) {
    return tableNode.def.canRenderInTable();
  }

  return false;
}

const DeleteElement = ({
  uuid,
  isDeletingRow,
  edit,
  deleteButtonText,
  firstCellData,
  langAsString,
  alertOnDeleteProps: { alertOpen, setAlertOpen, confirmChange, cancelChange, handleChange: handleDelete },
  children,
}: {
  uuid: string;
  isDeletingRow: boolean;
  edit: IGroupEditPropertiesInternal;
  deleteButtonText: string;
  firstCellData: string | undefined;
  langAsString: (key: string) => string;
  alertOnDeleteProps: AlertOnChange<(uuid: string) => void>;
  children: React.ReactNode;
}) => (
  <ConditionalWrapper
    condition={Boolean(edit?.alertOnDelete)}
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
      onClick={() => handleDelete(uuid)}
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
