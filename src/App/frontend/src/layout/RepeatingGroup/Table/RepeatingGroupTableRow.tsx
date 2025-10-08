import React, { useLayoutEffect } from 'react';
import type { JSX } from 'react';

import { Table } from '@digdir/designsystemet-react';
import { PencilIcon, TrashIcon, XMarkOctagonFillIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { Button } from 'src/app-components/Button/Button';
import { Flex } from 'src/app-components/Flex/Flex';
import { DeleteWarningPopover } from 'src/features/alertOnChange/DeleteWarningPopover';
import { useAlertOnChange } from 'src/features/alertOnChange/useAlertOnChange';
import { useDisplayData, useDisplayDataFor } from 'src/features/displayData/useDisplayData';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useDeepValidationsForNode } from 'src/features/validation/selectors/deepValidationsForNode';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { getComponentDef } from 'src/layout';
import { GenericComponent } from 'src/layout/GenericComponent';
import {
  RepGroupContext,
  useRepeatingGroupComponentId,
} from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { useRepeatingGroupsFocusContext } from 'src/layout/RepeatingGroup/Providers/RepeatingGroupFocusContext';
import classes from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import { useTableComponentIds } from 'src/layout/RepeatingGroup/useTableComponentIds';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { useColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { AlertOnChange } from 'src/features/alertOnChange/useAlertOnChange';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { ITableColumnFormatting } from 'src/layout/common.generated';
import type { CompTypes, ITextResourceBindings } from 'src/layout/layout';
import type { CompRepeatingGroupExternal, IGroupEditProperties } from 'src/layout/RepeatingGroup/config.generated';
import type { GroupExpressions } from 'src/layout/RepeatingGroup/types';
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

export function RepeatingGroupTableRow({
  className,
  uuid,
  index,
  mobileView,
  displayEditColumn,
  displayDeleteColumn,
}: IRepeatingGroupTableRowProps): JSX.Element | null {
  const mobileViewSmall = useIsMobile();
  const { refSetter } = useRepeatingGroupsFocusContext();

  const baseComponentId = useRepeatingGroupComponentId();
  const deleteRow = RepGroupContext.useDeleteRow();
  const toggleEditing = RepGroupContext.useToggleEditing();
  const indexedId = useIndexedId(baseComponentId);
  const langTools = useLanguage();
  const { langAsString } = langTools;
  const { edit: editForGroup, tableColumns: columnSettings } = useItemWhenType(baseComponentId, 'RepeatingGroup');
  const rowExpressions = RepGroupHooks.useRowWithExpressions(baseComponentId, { uuid });
  const editForRow = rowExpressions?.edit;
  const trbForRow = rowExpressions?.textResourceBindings;

  const alertOnDelete = useAlertOnChange(Boolean(editForRow?.alertOnDelete), deleteRow);

  const layoutLookups = useLayoutLookups();
  const rawTableIds = useTableComponentIds(baseComponentId);
  const tableItems = rawTableIds.map((baseId) => ({
    baseId,
    type: layoutLookups.getComponent(baseId).type,
  }));
  const isEditingRow = RepGroupContext.useIsEditingRow(uuid);
  const isDeletingRow = RepGroupContext.useIsDeletingRow(uuid);

  const [rowHasErrors, setRowHasErrors] = React.useState(false);
  const editButtonText = rowHasErrors
    ? langAsString('general.edit_alt_error')
    : getEditButtonText(isEditingRow, langTools, trbForRow);

  const deleteButtonText = langAsString('general.delete');

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
      <FindDeepValidations
        setRowHasErrors={setRowHasErrors}
        columnSettings={columnSettings}
        index={index}
        editMode={editForGroup?.mode}
      />
      {!mobileView ? (
        tableItems.map((item) =>
          shouldEditInTable(editForGroup?.mode, item.baseId, item.type, columnSettings) ? (
            <Table.Cell
              key={item.baseId}
              className={classes.tableCell}
            >
              <div ref={(ref) => refSetter && refSetter(index, `component-${item.baseId}`, ref)}>
                <GenericComponent
                  baseComponentId={item.baseId}
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
              key={item.baseId}
              baseComponentId={item.baseId}
              columnSettings={columnSettings}
              rowUuid={uuid}
            />
          ),
        )
      ) : (
        <Table.Cell className={classes.mobileTableCell}>
          <Flex
            container
            spacing={6}
          >
            {tableItems.map(
              (item, i, { length }) =>
                !isEditingRow &&
                (shouldEditInTable(editForGroup?.mode, item.baseId, item.type, columnSettings) ? (
                  <Flex
                    container
                    item
                    key={item.baseId}
                    ref={(ref) => refSetter && refSetter(index, `component-${item.baseId}`, ref)}
                  >
                    <GenericComponent
                      baseComponentId={item.baseId}
                      overrideItemProps={{
                        grid: {},
                      }}
                    />
                  </Flex>
                ) : (
                  <Flex
                    container
                    item
                    key={item.baseId}
                  >
                    <b className={cn(classes.contentFormatting, classes.spaceAfterContent)}>
                      <TableTitle
                        baseComponentId={item.baseId}
                        compType={item.type}
                      />
                      :
                    </b>
                    <span className={classes.contentFormatting}>
                      <DisplayData baseComponentId={item.baseId} />
                    </span>
                    {i < length - 1 && <div style={{ height: 8 }} />}
                  </Flex>
                )),
            )}
          </Flex>
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
                <EditElement
                  mobileViewSmall={false}
                  ariaExpanded={isEditingRow}
                  indexedId={indexedId}
                  uuid={uuid}
                  onClick={() => toggleEditing({ index, uuid })}
                  editButtonText={editButtonText}
                  rowHasErrors={rowHasErrors}
                />
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
              <EditElement
                ariaExpanded={isEditingRow}
                indexedId={indexedId}
                uuid={uuid}
                mobileViewSmall={mobileViewSmall}
                onClick={() => toggleEditing({ index, uuid })}
                editButtonText={editButtonText}
                rowHasErrors={rowHasErrors}
              />
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
  groupEditMode: IGroupEditProperties['mode'],
  componentId: string,
  type: CompTypes,
  columnSettings: CompRepeatingGroupExternal['tableColumns'],
) {
  const column = columnSettings && columnSettings[componentId];
  const def = getComponentDef(type);
  if (groupEditMode === 'onlyTable' && column?.editInTable !== false) {
    return def.canRenderInTable();
  }

  if (column && column.editInTable) {
    return def.canRenderInTable();
  }

  return false;
}

function EditElement({
  ariaExpanded,
  editButtonText,
  indexedId,
  mobileViewSmall,
  onClick,
  rowHasErrors,
  uuid,
}: {
  ariaExpanded: boolean;
  indexedId: string;
  uuid: string;
  mobileViewSmall: boolean;
  onClick: () => void;
  editButtonText: string;
  rowHasErrors: boolean;
}) {
  const ariaLabel = useAriaLabel(editButtonText);
  return (
    <Button
      aria-expanded={ariaExpanded}
      aria-controls={ariaExpanded ? `group-edit-container-${indexedId}-${uuid}` : undefined}
      variant='tertiary'
      color='second'
      icon={!ariaExpanded && mobileViewSmall}
      onClick={onClick}
      aria-label={ariaLabel}
      className={classes.tableButton}
    >
      {(ariaExpanded || !mobileViewSmall) && editButtonText}
      {rowHasErrors ? (
        <span style={{ color: '#C30000' }}>
          <XMarkOctagonFillIcon
            fontSize='1rem'
            aria-hidden='true'
            style={{ verticalAlign: 'middle' }}
          />
        </span>
      ) : (
        <PencilIcon
          fontSize='1rem'
          aria-hidden='true'
        />
      )}
    </Button>
  );
}

function DeleteElement({
  index,
  uuid,
  isDeletingRow,
  editForRow,
  deleteButtonText,
  langAsString,
  disabled,
  alertOnDeleteProps: { alertOpen, setAlertOpen, confirmChange, cancelChange, handleChange: handleDelete },
  children,
}: {
  index: number;
  uuid: string;
  isDeletingRow: boolean;
  editForRow: GroupExpressions['edit'];
  deleteButtonText: string;
  langAsString: (key: string) => string;
  alertOnDeleteProps: AlertOnChange<(row: BaseRow) => void>;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const ariaLabel = useAriaLabel(deleteButtonText);
  return (
    <>
      {editForRow?.alertOnDelete && (
        <DeleteWarningPopover
          placement='left'
          deleteButtonText={langAsString('group.row_popover_delete_button_confirm')}
          messageText={langAsString('group.row_popover_delete_message')}
          onCancelClick={cancelChange}
          onPopoverDeleteClick={confirmChange}
          open={alertOpen}
          popoverId={`delete-warning-popover-${uuid}`}
          setOpen={setAlertOpen}
        />
      )}
      <Button
        variant='tertiary'
        color='danger'
        popoverTarget={`delete-warning-popover-${uuid}`}
        disabled={isDeletingRow || disabled}
        onClick={() => handleDelete({ index, uuid })}
        aria-label={ariaLabel}
        icon={!children}
        className={classes.tableButton}
      >
        {children}
        <TrashIcon
          fontSize='1rem'
          aria-hidden='true'
        />
      </Button>
    </>
  );
}

function NonEditableCell({
  baseComponentId,
  rowUuid,
  columnSettings,
}: {
  baseComponentId: string;
  rowUuid: string;
  columnSettings: ITableColumnFormatting | undefined;
}) {
  const style = useColumnStylesRepeatingGroups(baseComponentId, columnSettings);
  const isEditingRow = RepGroupContext.useIsEditingRow(rowUuid);

  return (
    <Table.Cell className={classes.tableCell}>
      <span
        className={classes.contentFormatting}
        style={style}
      >
        {isEditingRow ? null : <DisplayData baseComponentId={baseComponentId} />}
      </span>
    </Table.Cell>
  );
}

function TableTitle({ baseComponentId, compType }: { baseComponentId: string; compType: CompTypes }) {
  const item = useItemWhenType(baseComponentId, compType);
  return <Lang id={getTableTitle(item?.textResourceBindings ?? {})} />;
}

function DisplayData({ baseComponentId }: { baseComponentId: string }) {
  return useDisplayData(baseComponentId);
}

function useAriaLabel(prefix: string) {
  const baseComponentId = useRepeatingGroupComponentId();
  const rawTableIds = useTableComponentIds(baseComponentId);
  const displayData = useDisplayDataFor(rawTableIds);
  const firstCellData = Object.values(displayData).find((c) => !!c) ?? '';

  return firstCellData ? `${prefix} ${firstCellData}` : prefix;
}

function FindDeepValidations({
  setRowHasErrors,
  index,
  editMode,
  columnSettings,
}: {
  setRowHasErrors: (hasErrors: boolean) => void;
  index: number;
  editMode: IGroupEditProperties['mode'];
  columnSettings: CompRepeatingGroupExternal['tableColumns'];
}) {
  const baseComponentId = useRepeatingGroupComponentId();
  const layoutLookups = useLayoutLookups();
  const rawTableIds = useTableComponentIds(baseComponentId);
  const tableItems = rawTableIds.map((baseId) => ({
    baseId,
    type: layoutLookups.getComponent(baseId).type,
  }));

  // If the row has errors we should highlight the row, unless the errors are for components that are shown in the table,
  // then the component getting highlighted is enough
  const tableEditingIds = tableItems
    .filter((i) => shouldEditInTable(editMode, i.baseId, i.type, columnSettings))
    .map((i) => i.baseId);

  const rowValidations = useDeepValidationsForNode(baseComponentId, false, index, true);
  const rowHasErrors = rowValidations.some(
    (validation) => validation.severity === 'error' && !tableEditingIds.includes(validation.baseComponentId),
  );

  useLayoutEffect(() => {
    setRowHasErrors(rowHasErrors);
  }, [rowHasErrors, setRowHasErrors]);

  return null;
}
