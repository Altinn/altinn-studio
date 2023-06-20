import React from 'react';

import { Button, ButtonColor, ButtonVariant, TableCell, TableRow } from '@digdir/design-system-react';
import { Grid } from '@material-ui/core';
import { Delete as DeleteIcon, Edit as EditIcon, ErrorColored as ErrorIcon } from '@navikt/ds-icons';
import cn from 'classnames';

import { DeleteWarningPopover } from 'src/components/molecules/DeleteWarningPopover';
import { useIsMobile } from 'src/hooks/useIsMobile';
import { useLanguage } from 'src/hooks/useLanguage';
import { GenericComponent } from 'src/layout/GenericComponent';
import classes from 'src/layout/Group/RepeatingGroup.module.css';
import { useRepeatingGroupsFocusContext } from 'src/layout/Group/RepeatingGroupsFocusContext';
import { getColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import type { ExprResolved } from 'src/features/expressions/types';
import type { IUseLanguage } from 'src/hooks/useLanguage';
import type { HRepGroup, ILayoutGroup } from 'src/layout/Group/types';
import type { ITextResourceBindings } from 'src/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface IRepeatingGroupTableRowProps {
  node: LayoutNode<HRepGroup, 'Group'>;
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
  deleteFunctionality?: {
    popoverOpen: boolean;
    popoverPanelIndex: number;
    onDeleteClick: () => void;
    setPopoverOpen: (open: boolean) => void;
    onOpenChange: (index: number) => void;
    onPopoverDeleteClick: (index: number) => () => void;
  };
  displayEditColumn: boolean;
  displayDeleteColumn: boolean;
}

function getTableTitle(textResourceBindings: ITextResourceBindings) {
  if (textResourceBindings.tableTitle) {
    return textResourceBindings.tableTitle;
  }
  if (textResourceBindings.title) {
    return textResourceBindings.title;
  }
  return '';
}

function getEditButtonText(
  isEditing: boolean,
  langTools: IUseLanguage,
  textResourceBindings: ITextResourceBindings | undefined,
) {
  if (isEditing && textResourceBindings?.edit_button_close) {
    return langTools.langAsString(textResourceBindings?.edit_button_close);
  } else if (!isEditing && textResourceBindings?.edit_button_open) {
    return langTools.langAsString(textResourceBindings?.edit_button_open);
  }

  return isEditing ? langTools.langAsString('general.save_and_close') : langTools.langAsString('general.edit_alt');
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
  deleteFunctionality,
  displayEditColumn,
  displayDeleteColumn,
}: IRepeatingGroupTableRowProps): JSX.Element {
  const mobileViewSmall = useIsMobile();
  const { refSetter } = useRepeatingGroupsFocusContext();

  const { popoverOpen, popoverPanelIndex, onDeleteClick, setPopoverOpen, onPopoverDeleteClick, onOpenChange } =
    deleteFunctionality || {};

  const langTools = useLanguage();
  const { lang, langAsString } = langTools;
  const id = node.item.id;
  const group = node.item;
  const row = group.rows[index] ? group.rows[index] : undefined;
  const expressionsForRow = row?.groupExpressions;
  const columnSettings = group.tableColumns;
  const edit = {
    ...group.edit,
    ...expressionsForRow?.edit,
  } as ExprResolved<ILayoutGroup['edit']>;
  const resolvedTextBindings = {
    ...group.textResourceBindings,
    ...expressionsForRow?.textResourceBindings,
  } as ExprResolved<ILayoutGroup['textResourceBindings']>;

  const tableNodes = getTableNodes(index) || [];
  const displayData = tableNodes.map((node) =>
    'useDisplayData' in node.def ? node.def.useDisplayData(node as any) : '',
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
                style={getColumnStylesRepeatingGroups(n.item, columnSettings)}
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
                      {lang(getTableTitle(n.item.textResourceBindings || {}))}:
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
                  variant={ButtonVariant.Quiet}
                  color={ButtonColor.Secondary}
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
          {edit?.deleteButton !== false &&
            displayDeleteColumn &&
            setPopoverOpen &&
            onOpenChange &&
            onPopoverDeleteClick &&
            typeof popoverOpen === 'boolean' && (
              <TableCell
                key={`delete-${index}`}
                className={cn(
                  {
                    [classes.popoverCurrentCell]: index == popoverPanelIndex,
                  },
                  classes.buttonCell,
                )}
                colSpan={displayEditColumn && edit?.editButton === false ? 2 : 1}
              >
                <div className={classes.buttonInCellWrapper}>
                  {(() => {
                    const deleteButton = (
                      <Button
                        variant={ButtonVariant.Quiet}
                        color={ButtonColor.Danger}
                        icon={<DeleteIcon aria-hidden='true' />}
                        iconPlacement='right'
                        disabled={deleting}
                        onClick={onDeleteClick}
                        aria-label={`${deleteButtonText}-${firstCellData}`}
                        data-testid='delete-button'
                        className={classes.tableButton}
                      >
                        {deleteButtonText}
                      </Button>
                    );

                    if (edit?.alertOnDelete) {
                      return (
                        <DeleteWarningPopover
                          trigger={deleteButton}
                          side='left'
                          deleteButtonText={langAsString('group.row_popover_delete_button_confirm')}
                          messageText={langAsString('group.row_popover_delete_message')}
                          open={popoverPanelIndex == index && popoverOpen}
                          setPopoverOpen={setPopoverOpen}
                          onCancelClick={() => onOpenChange(index)}
                          onPopoverDeleteClick={onPopoverDeleteClick(index)}
                        />
                      );
                    } else {
                      return deleteButton;
                    }
                  })()}
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
                variant={ButtonVariant.Quiet}
                color={ButtonColor.Secondary}
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
            {edit?.deleteButton !== false &&
              setPopoverOpen &&
              onOpenChange &&
              onPopoverDeleteClick &&
              typeof popoverOpen === 'boolean' && (
                <>
                  <div style={{ height: 8 }} />
                  {(() => {
                    const deleteButton = (
                      <Button
                        variant={ButtonVariant.Quiet}
                        color={ButtonColor.Danger}
                        icon={<DeleteIcon aria-hidden='true' />}
                        iconPlacement='right'
                        disabled={deleting}
                        onClick={onDeleteClick}
                        aria-label={`${deleteButtonText}-${firstCellData}`}
                        data-testid='delete-button'
                        className={classes.tableButton}
                      >
                        {(isEditingRow || !mobileViewSmall) && deleteButtonText}
                      </Button>
                    );

                    if (edit?.alertOnDelete) {
                      return (
                        <DeleteWarningPopover
                          trigger={deleteButton}
                          side='left'
                          deleteButtonText={langAsString('group.row_popover_delete_button_confirm')}
                          messageText={langAsString('group.row_popover_delete_message')}
                          open={popoverPanelIndex == index && popoverOpen}
                          setPopoverOpen={setPopoverOpen}
                          onCancelClick={() => onOpenChange(index)}
                          onPopoverDeleteClick={onPopoverDeleteClick(index)}
                        />
                      );
                    } else {
                      return deleteButton;
                    }
                  })()}
                </>
              )}
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

export function shouldEditInTable(
  groupEdit: ExprResolved<ILayoutGroup['edit']>,
  tableNode: LayoutNode,
  columnSettings: ILayoutGroup['tableColumns'],
) {
  if (groupEdit?.mode === 'onlyTable') {
    return tableNode.def.canRenderInTable();
  }

  const column = columnSettings && columnSettings[tableNode.item.baseComponentId || tableNode.item.id];
  if (column && column.editInTable) {
    return tableNode.def.canRenderInTable();
  }

  return false;
}
