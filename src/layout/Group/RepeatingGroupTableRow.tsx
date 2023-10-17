import React from 'react';

import { Button, TableCell, TableRow } from '@digdir/design-system-react';
import { Grid } from '@material-ui/core';
import { Delete as DeleteIcon, Edit as EditIcon, ErrorColored as ErrorIcon } from '@navikt/ds-icons';
import cn from 'classnames';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { DeleteWarningPopover } from 'src/components/molecules/DeleteWarningPopover';
import { useAlertOnChange } from 'src/hooks/useAlertOnChange';
import { useIsMobile } from 'src/hooks/useIsMobile';
import { useLanguage } from 'src/hooks/useLanguage';
import { GenericComponent } from 'src/layout/GenericComponent';
import classes from 'src/layout/Group/RepeatingGroup.module.css';
import { useRepeatingGroupsFocusContext } from 'src/layout/Group/RepeatingGroupsFocusContext';
import { implementsDisplayData, useDisplayDataProps } from 'src/layout/index';
import { getColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import type { AlertOnChangeProps } from 'src/hooks/useAlertOnChange';
import type { IUseLanguage } from 'src/hooks/useLanguage';
import type {
  CompGroupRepeatingExternal,
  CompGroupRepeatingInternal,
  IGroupEditPropertiesInternal,
} from 'src/layout/Group/config.generated';
import type { LayoutNodeForGroup } from 'src/layout/Group/LayoutNodeForGroup';
import type { ITextResourceBindings } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface IRepeatingGroupTableRowProps {
  node: LayoutNodeForGroup<CompGroupRepeatingInternal>;
  className?: string;
  editIndex: number;
  setEditIndex: (index: number, forceValidation?: boolean) => void;
  onClickRemove: (groupIndex: number) => void;
  deleting: boolean;
  index: number;
  rowHasErrors: boolean;
  getTableNodes: (index: number) => LayoutNode[] | undefined;
  onEditClick: () => void;
  mobileView: boolean;
  onDeleteClick: (index: number) => void;
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
  textResourceBindings: CompGroupRepeatingInternal['textResourceBindings'] | undefined,
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
  node,
  className,
  editIndex,
  deleting,
  index,
  rowHasErrors,
  getTableNodes,
  onEditClick,
  mobileView,
  onDeleteClick,
  displayEditColumn,
  displayDeleteColumn,
}: IRepeatingGroupTableRowProps): JSX.Element {
  const mobileViewSmall = useIsMobile();
  const { refSetter } = useRepeatingGroupsFocusContext();

  const langTools = useLanguage();
  const { lang, langAsString } = langTools;
  const id = node.item.id;
  const group = node.item;
  const row = group.rows[index];
  const expressionsForRow = row?.groupExpressions;
  const columnSettings = group.tableColumns;
  const edit = {
    ...group.edit,
    ...expressionsForRow?.edit,
  } as IGroupEditPropertiesInternal;
  const resolvedTextBindings = {
    ...group.textResourceBindings,
    ...expressionsForRow?.textResourceBindings,
  } as CompGroupRepeatingInternal['textResourceBindings'];

  const alertOnDelete = useAlertOnChange(Boolean(edit?.alertOnDelete), onDeleteClick);

  const tableNodes = getTableNodes(index) || [];
  const displayDataProps = useDisplayDataProps();
  const displayData = tableNodes.map((node) =>
    implementsDisplayData(node.def) ? node.def.getDisplayData(node as any, displayDataProps) : '',
  );
  const firstCellData = displayData.find((c) => !!c);
  const isEditingRow = index === editIndex;

  const editButtonText = rowHasErrors
    ? langAsString('general.edit_alt_error')
    : getEditButtonText(editIndex === index, langTools, resolvedTextBindings);

  const deleteButtonText = langAsString('general.delete');

  return (
    <TableRow
      key={`repeating-group-row-${index}`}
      className={cn(
        {
          [classes.tableRowError]: rowHasErrors,
        },
        className,
      )}
      data-row-num={index}
    >
      {!mobileView ? (
        tableNodes.map((n, idx) =>
          shouldEditInTable(edit, n, columnSettings) ? (
            <TableCell key={n.item.id}>
              <div ref={(ref) => refSetter && refSetter(index, `component-${n.item.id}`, ref)}>
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
            </TableCell>
          ) : (
            <TableCell key={`${n.item.id}-${index}`}>
              <span
                className={classes.contentFormatting}
                style={getColumnStylesRepeatingGroups(n, columnSettings)}
              >
                {isEditingRow ? null : displayData[idx]}
              </span>
            </TableCell>
          ),
        )
      ) : (
        <TableCell className={classes.mobileTableCell}>
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
                    ref={(ref) => refSetter && refSetter(index, `component-${n.item.id}`, ref)}
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
                      {lang(getTableTitle('textResourceBindings' in n.item ? n.item.textResourceBindings : {}))}:
                    </b>
                    <span className={classes.contentFormatting}>{displayData[i]}</span>
                    {i < length - 1 && <div style={{ height: 8 }} />}
                  </Grid>
                )),
            )}
          </Grid>
        </TableCell>
      )}
      {!mobileView ? (
        <>
          {edit?.editButton === false && edit?.deleteButton === false && (displayEditColumn || displayDeleteColumn) ? (
            <TableCell
              key={`editDelete-${index}`}
              colSpan={displayEditColumn && displayDeleteColumn ? 2 : 1}
            />
          ) : null}
          {edit?.editButton !== false && displayEditColumn && (
            <TableCell
              key={`edit-${index}`}
              className={classes.buttonCell}
              colSpan={displayDeleteColumn && edit?.deleteButton === false ? 2 : 1}
            >
              <div className={classes.buttonInCellWrapper}>
                <Button
                  aria-expanded={isEditingRow}
                  aria-controls={isEditingRow ? `group-edit-container-${id}-${index}` : undefined}
                  variant='tertiary'
                  color='second'
                  size='small'
                  icon={rowHasErrors ? <ErrorIcon aria-hidden='true' /> : <EditIcon aria-hidden='true' />}
                  iconPlacement='right'
                  onClick={onEditClick}
                  aria-label={`${editButtonText} ${firstCellData}`}
                  data-testid='edit-button'
                  className={classes.tableButton}
                >
                  {editButtonText}
                </Button>
              </div>
            </TableCell>
          )}
          {edit?.deleteButton !== false && displayDeleteColumn && (
            <TableCell
              key={`delete-${index}`}
              className={cn(classes.buttonCell)}
              colSpan={displayEditColumn && edit?.editButton === false ? 2 : 1}
            >
              <div className={classes.buttonInCellWrapper}>
                <DeleteElement
                  index={index}
                  deleting={deleting}
                  edit={edit}
                  deleteButtonText={deleteButtonText}
                  firstCellData={firstCellData}
                  alertOnDeleteProps={alertOnDelete}
                  langAsString={langAsString}
                >
                  {deleteButtonText}
                </DeleteElement>
              </div>
            </TableCell>
          )}
        </>
      ) : (
        <TableCell
          className={cn(classes.buttonCell, classes.mobileTableCell)}
          style={{ verticalAlign: 'top' }}
        >
          <div className={classes.buttonInCellWrapper}>
            {edit?.editButton !== false && (
              <Button
                aria-expanded={isEditingRow}
                aria-controls={isEditingRow ? `group-edit-container-${id}-${index}` : undefined}
                variant='tertiary'
                color='second'
                size='small'
                icon={rowHasErrors ? <ErrorIcon aria-hidden='true' /> : <EditIcon aria-hidden='true' />}
                iconPlacement='right'
                onClick={onEditClick}
                aria-label={`${editButtonText} ${firstCellData}`}
                data-testid='edit-button'
                className={classes.tableButton}
              >
                {(isEditingRow || !mobileViewSmall) && editButtonText}
              </Button>
            )}
            {edit?.deleteButton !== false && (
              <>
                <div style={{ height: 8 }} />
                <DeleteElement
                  index={index}
                  deleting={deleting}
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
        </TableCell>
      )}
    </TableRow>
  );
}

export function shouldEditInTable(
  groupEdit: IGroupEditPropertiesInternal,
  tableNode: LayoutNode,
  columnSettings: CompGroupRepeatingExternal['tableColumns'],
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
  index,
  deleting,
  edit,
  deleteButtonText,
  firstCellData,
  langAsString,
  alertOnDeleteProps: { alertOpen, setAlertOpen, confirmChange, cancelChange, handleChange: handleDelete },
  children,
}: {
  index: number;
  deleting: boolean;
  edit: IGroupEditPropertiesInternal;
  deleteButtonText: string;
  firstCellData: string | undefined;
  langAsString: (key: string) => string;
  alertOnDeleteProps: AlertOnChangeProps;
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
      icon={<DeleteIcon aria-hidden='true' />}
      iconPlacement='right'
      size='small'
      disabled={deleting}
      onClick={() => handleDelete(index)}
      aria-label={`${deleteButtonText}-${firstCellData}`}
      data-testid='delete-button'
      className={classes.tableButton}
    >
      {children}
    </Button>
  </ConditionalWrapper>
);
