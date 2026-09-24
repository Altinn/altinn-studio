import React, { useLayoutEffect } from 'react';
import type { JSX } from 'react';

import { Button, Flex, useIsMobile } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Table } from '@digdir/designsystemet-react';
import { PencilIcon, TrashIcon, XMarkOctagonFillIcon } from '@navikt/aksel-icons';
import cn from 'classnames';
import type { ITableColumnFormatting } from '@app/layout-contract/generated/common.generated';
import type {
  CompRepeatingGroupExternal,
  IGroupEditProperties,
} from '@app/layout-contract/generated/components/RepeatingGroup/config.generated';

import { DeleteWarningPopover } from 'src/features/alertOnChange/DeleteWarningPopover';
import { useAlertOnChange } from 'src/features/alertOnChange/useAlertOnChange';
import { useDisplayData, useDisplayDataFor } from 'src/features/displayData/useDisplayData';
import { FormStore } from 'src/features/form/FormContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useDeepValidationsForNode } from 'src/features/validation/selectors/deepValidationsForNode';
import { getComponentDef } from 'src/layout';
import { GenericComponent } from 'src/layout/GenericComponent';
import {
  RepGroupContext,
  useRepeatingGroupComponentId,
} from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import {
  useDeleteRowAndFocus,
  useRepeatingGroupsFocusContext,
} from 'src/layout/RepeatingGroup/Providers/RepeatingGroupFocusContext';
import classes from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import { useTableTitle } from 'src/layout/RepeatingGroup/Table/RepeatingGroupTableTitle';
import { useTableComponentIds } from 'src/layout/RepeatingGroup/useTableComponentIds';
import { useColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { CompTypes } from 'src/layout/layout';

export interface IRepeatingGroupTableRowProps {
  className?: string;
  uuid: string;
  index: number;
  mobileView: boolean;
  displayEditColumn: boolean;
  displayDeleteColumn: boolean;
  useVerticalButtonLayout: boolean;
  hiddenColumns: string[];
}

function getEditButtonText(
  isEditing: boolean,
  langTools: IUseLanguage,
  editButtonOpen: string,
  editButtonClose: string,
) {
  const buttonTextKey = isEditing ? editButtonClose || 'general.save_and_close' : editButtonOpen || 'general.edit_alt';
  return langTools.langAsString(buttonTextKey);
}

export function RepeatingGroupTableRow({
  className,
  uuid,
  index,
  mobileView,
  displayEditColumn,
  displayDeleteColumn,
  useVerticalButtonLayout,
  hiddenColumns,
}: IRepeatingGroupTableRowProps): JSX.Element | null {
  const mobileViewSmall = useIsMobile();
  const { refSetter } = useRepeatingGroupsFocusContext();

  const baseComponentId = useRepeatingGroupComponentId();
  const toggleEditing = RepGroupContext.useToggleEditing();
  const indexedId = useIndexedId(baseComponentId);
  const langTools = useLanguage();
  const { langAsString } = langTools;
  const config = useComponentConfig(baseComponentId, 'RepeatingGroup');

  const compactButtons = Boolean(config.edit?.compactButtons);
  const editButton = useEvalExpression(config.edit?.editButton, Expressions.RepeatingGroup.edit.editButton);
  const deleteButton = useEvalExpression(config.edit?.deleteButton, Expressions.RepeatingGroup.edit.deleteButton);
  const editButtonOpen = useEvalExpression(
    config.textResourceBindings?.editButtonOpen,
    Expressions.RepeatingGroup.textResourceBindings.editButtonOpen,
  );
  const editButtonClose = useEvalExpression(
    config.textResourceBindings?.editButtonClose,
    Expressions.RepeatingGroup.textResourceBindings.editButtonClose,
  );

  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  const rawTableIds = useTableComponentIds(baseComponentId);
  const tableItems = rawTableIds
    .filter((id) => !hiddenColumns.includes(id))
    .map((baseId) => ({
      baseId,
      type: layoutLookups.getComponent(baseId).type,
    }));
  const isEditingRow = RepGroupContext.useIsEditingRow(uuid);
  const isDeletingRow = RepGroupContext.useIsDeletingRow(uuid);

  const [rowHasErrors, setRowHasErrors] = React.useState(false);
  const editButtonText = rowHasErrors
    ? langAsString('general.edit_alt_error')
    : getEditButtonText(isEditingRow, langTools, editButtonOpen, editButtonClose);

  const deleteButtonText = langAsString('general.delete');
  const toggleDeletebuttonText = isEditingRow || !mobileViewSmall ? deleteButtonText : null;

  return (
    <Table.Row
      ref={(node) => refSetter(index, 'row', node)}
      className={cn({ [classes.tableRowError]: rowHasErrors }, className)}
      data-row-num={index}
      data-row-uuid={uuid}
    >
      <FindDeepValidations
        setRowHasErrors={setRowHasErrors}
        columnSettings={config.tableColumns}
        index={index}
        editMode={config.edit?.mode}
      />
      {!mobileView ? (
        tableItems.map((item) =>
          shouldEditInTable(config.edit?.mode, item.baseId, item.type, config.tableColumns) ? (
            <EditableCell
              key={item.baseId}
              index={index}
              refSetter={refSetter}
              baseComponentId={item.baseId}
              columnSettings={config.tableColumns}
            />
          ) : (
            <NonEditableCell
              key={item.baseId}
              baseComponentId={item.baseId}
              columnSettings={config.tableColumns}
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
                (shouldEditInTable(config.edit?.mode, item.baseId, item.type, config.tableColumns) ? (
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
        useVerticalButtonLayout ? (
          <>
            {editButton === false && deleteButton === false && (displayEditColumn || displayDeleteColumn) ? (
              <Table.Cell key={`editDelete-${uuid}`} />
            ) : null}
            {(editButton !== false || deleteButton !== false) && (displayEditColumn || displayDeleteColumn) && (
              <Table.Cell
                key={`actions-${uuid}`}
                className={classes.buttonCell}
              >
                <div className={classes.buttonInCellWrapper}>
                  {editButton !== false && displayEditColumn && (
                    <EditElement
                      mobileViewSmall={false}
                      ariaExpanded={isEditingRow}
                      indexedId={indexedId}
                      uuid={uuid}
                      onClick={() => toggleEditing({ index, uuid })}
                      editButtonText={editButtonText}
                      rowHasErrors={rowHasErrors}
                      compactButtons={compactButtons}
                      buttonRef={(node) => refSetter(index, 'editButton', node)}
                    />
                  )}
                  {deleteButton !== false && displayDeleteColumn && (
                    <DeleteElement
                      index={index}
                      uuid={uuid}
                      isDeletingRow={isDeletingRow}
                      deleteButtonText={deleteButtonText}
                      langAsString={langAsString}
                    >
                      {compactButtons ? (isEditingRow ? deleteButtonText : null) : deleteButtonText}
                    </DeleteElement>
                  )}
                </div>
              </Table.Cell>
            )}
          </>
        ) : (
          <>
            {editButton === false && deleteButton === false && (displayEditColumn || displayDeleteColumn) ? (
              <Table.Cell
                key={`editDelete-${uuid}`}
                colSpan={displayEditColumn && displayDeleteColumn ? 2 : 1}
              />
            ) : null}
            {editButton !== false && displayEditColumn && (
              <Table.Cell
                key={`edit-${uuid}`}
                className={classes.buttonCell}
                colSpan={displayDeleteColumn && deleteButton === false ? 2 : 1}
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
                    compactButtons={compactButtons}
                    buttonRef={(node) => refSetter(index, 'editButton', node)}
                  />
                </div>
              </Table.Cell>
            )}
            {deleteButton !== false && displayDeleteColumn && (
              <Table.Cell
                key={`delete-${uuid}`}
                className={cn(classes.buttonCell)}
                colSpan={displayEditColumn && editButton === false ? 2 : 1}
              >
                <div className={classes.buttonInCellWrapper}>
                  <DeleteElement
                    index={index}
                    uuid={uuid}
                    isDeletingRow={isDeletingRow}
                    deleteButtonText={deleteButtonText}
                    langAsString={langAsString}
                  >
                    {compactButtons ? (isEditingRow ? deleteButtonText : null) : deleteButtonText}
                  </DeleteElement>
                </div>
              </Table.Cell>
            )}
          </>
        )
      ) : (
        <Table.Cell
          className={cn(classes.buttonCell, classes.mobileTableCell)}
          style={{ verticalAlign: 'top' }}
        >
          <div className={classes.buttonInCellWrapper}>
            {editButton !== false && (
              <EditElement
                ariaExpanded={isEditingRow}
                indexedId={indexedId}
                uuid={uuid}
                mobileViewSmall={mobileViewSmall}
                onClick={() => toggleEditing({ index, uuid })}
                editButtonText={editButtonText}
                rowHasErrors={rowHasErrors}
                compactButtons={compactButtons}
                buttonRef={(node) => refSetter(index, 'editButton', node)}
              />
            )}
            {deleteButton !== false && (
              <>
                <div style={{ height: 8 }} />
                <DeleteElement
                  index={index}
                  uuid={uuid}
                  isDeletingRow={isDeletingRow}
                  deleteButtonText={deleteButtonText}
                  langAsString={langAsString}
                >
                  {compactButtons ? (isEditingRow ? deleteButtonText : null) : toggleDeletebuttonText}
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
  compactButtons,
  buttonRef,
}: {
  ariaExpanded: boolean;
  indexedId: string;
  uuid: string;
  mobileViewSmall: boolean;
  onClick: () => void;
  editButtonText: string;
  rowHasErrors: boolean;
  compactButtons: boolean;
  buttonRef?: (node: HTMLButtonElement | null) => void;
}) {
  const ariaLabel = useAriaLabel(editButtonText);
  const showText = compactButtons ? ariaExpanded : ariaExpanded || !mobileViewSmall;
  return (
    <Button
      ref={buttonRef}
      aria-expanded={ariaExpanded}
      aria-controls={ariaExpanded ? `group-edit-container-${indexedId}-${uuid}` : undefined}
      variant='tertiary'
      color='second'
      icon={!ariaExpanded && (compactButtons || mobileViewSmall)}
      onClick={onClick}
      aria-label={ariaLabel}
      className={classes.tableButton}
    >
      {showText && editButtonText}
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
  deleteButtonText,
  langAsString,
  disabled,
  children,
}: {
  index: number;
  uuid: string;
  isDeletingRow: boolean;
  deleteButtonText: string;
  langAsString: (key: string) => string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const config = useComponentConfig(useRepeatingGroupComponentId(), 'RepeatingGroup');
  const alertOnDelete = useEvalExpression(config.edit?.alertOnDelete, Expressions.RepeatingGroup.edit.alertOnDelete);
  const deleteRow = useDeleteRowAndFocus();
  const {
    alertOpen,
    setAlertOpen,
    confirmChange,
    cancelChange,
    handleChange: handleDelete,
  } = useAlertOnChange(alertOnDelete, deleteRow);
  const ariaLabel = useAriaLabel(deleteButtonText);
  return (
    <>
      {alertOnDelete && (
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

function EditableCell({
  baseComponentId,
  columnSettings,
  refSetter,
  index,
}: {
  baseComponentId: string;
  columnSettings: ITableColumnFormatting | undefined;
  index: number;
  refSetter: ((index: number, id: string, ref: HTMLDivElement | null) => void) | undefined;
}) {
  const style = useColumnStylesRepeatingGroups(baseComponentId, columnSettings);

  return (
    <Table.Cell className={classes.tableCell}>
      <div
        className={cn(classes.contentFormatting, classes.contentFormattingEditable)}
        style={style}
        ref={(ref) => refSetter && refSetter(index, `component-${baseComponentId}`, ref)}
      >
        <GenericComponent
          baseComponentId={baseComponentId}
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

function TableTitle({ baseComponentId }: { baseComponentId: string; compType: CompTypes }) {
  const title = useTableTitle(baseComponentId);
  return <Lang id={title} />;
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
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
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
