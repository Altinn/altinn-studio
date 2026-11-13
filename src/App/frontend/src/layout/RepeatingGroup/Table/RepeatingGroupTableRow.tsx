import React from 'react';
import type { JSX } from 'react';

import { Button, Flex, useIsMobile } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Table } from '@digdir/designsystemet-react';
import { PencilIcon, TrashIcon } from '@navikt/aksel-icons';
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
import { RepeatingGroupRowValidation } from 'src/layout/RepeatingGroup/Table/RepeatingGroupRowValidation';
import { useTableTitle } from 'src/layout/RepeatingGroup/Table/RepeatingGroupTableTitle';
import {
  RepeatingGroupTableField,
  RepeatingGroupTableMessages,
} from 'src/layout/RepeatingGroup/Table/RepeatingGroupTableValidation';
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
  tableIds: string[];
  columnCount: number;
}

function getEditButtonText(
  isEditing: boolean,
  langTools: IUseLanguage,
  editButtonOpen: string | undefined,
  editButtonClose: string | undefined,
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
  tableIds,
  columnCount,
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
  const tableItems = tableIds.map((baseId) => ({
    baseId,
    type: layoutLookups.getComponent(baseId).type,
  }));
  const isEditingRow = RepGroupContext.useIsEditingRow(uuid);
  const isDeletingRow = RepGroupContext.useIsDeletingRow(uuid);
  const instanceLocked = FormStore.useIsInstanceLocked();

  const rowValidations = useDeepValidationsForNode(baseComponentId, false, index, true);
  // Keep the existing background highlight for errors outside directly editable cells.
  const tableEditingIds = tableItems
    .filter((item) => shouldEditInTable(config.edit?.mode, item.baseId, item.type, config.tableColumns))
    .map((item) => item.baseId);
  const mobileTableItems = tableItems.filter(
    (item) =>
      !isEditingRow ||
      config.edit?.mode === 'onlyTable' ||
      (shouldEditInTable(config.edit?.mode, item.baseId, item.type, config.tableColumns) &&
        config.tableColumns?.[item.baseId]?.showInExpandedEdit === false),
  );
  const rowHasErrors = rowValidations.some(
    (validation) => validation.severity === 'error' && !tableEditingIds.includes(validation.baseComponentId),
  );
  const editButtonText = getEditButtonText(isEditingRow, langTools, editButtonOpen, editButtonClose);
  const validationIndicator = (
    <RepeatingGroupRowValidation
      validations={rowValidations}
      index={index}
    />
  );
  const editElement = editButton !== false && displayEditColumn && (
    <EditElement
      mobileViewSmall={mobileView && mobileViewSmall}
      ariaExpanded={isEditingRow}
      indexedId={indexedId}
      uuid={uuid}
      onClick={() => toggleEditing({ index, uuid })}
      disabled={instanceLocked}
      editButtonText={editButtonText}
      compactButtons={compactButtons}
      buttonRef={(node) => refSetter(index, 'editButton', node)}
    />
  );

  const deleteButtonText = langAsString('general.delete');
  const toggleDeletebuttonText = isEditingRow || !mobileViewSmall ? deleteButtonText : null;

  return (
    <>
      <Table.Row
        ref={(node) => refSetter(index, 'row', node)}
        className={cn({ [classes.tableRowError]: rowHasErrors, [classes.mobileRow]: mobileView }, className)}
        data-row-num={index}
        data-row-uuid={uuid}
      >
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
        ) : mobileTableItems.length > 0 ? (
          <Table.Cell className={classes.mobileTableCell}>
            <Flex
              container
              spacing={6}
            >
              {mobileTableItems.map((item, i, { length }) =>
                shouldEditInTable(config.edit?.mode, item.baseId, item.type, config.tableColumns) ? (
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
                ),
              )}
            </Flex>
          </Table.Cell>
        ) : null}
        {mobileView || useVerticalButtonLayout ? (
          <Table.Cell
            className={cn(classes.buttonCell, { [classes.mobileTableCell]: mobileView })}
            style={mobileView ? { verticalAlign: 'top' } : undefined}
          >
            <div className={classes.buttonInCellWrapper}>
              {validationIndicator}
              {editElement}
              {deleteButton !== false && displayDeleteColumn && (
                <DeleteElement
                  index={index}
                  uuid={uuid}
                  isDeletingRow={isDeletingRow}
                  disabled={instanceLocked}
                  deleteButtonText={deleteButtonText}
                  langAsString={langAsString}
                >
                  {compactButtons ? (isEditingRow ? deleteButtonText : null) : toggleDeletebuttonText}
                </DeleteElement>
              )}
            </div>
          </Table.Cell>
        ) : (
          <>
            {displayEditColumn && (
              <Table.Cell className={classes.buttonCell}>
                <div className={cn(classes.buttonInCellWrapper, classes.rowActions)}>
                  {validationIndicator}
                  {editElement}
                </div>
              </Table.Cell>
            )}
            {displayDeleteColumn && (
              <Table.Cell className={classes.buttonCell}>
                <div className={cn(classes.buttonInCellWrapper, classes.rowActions)}>
                  {!displayEditColumn && validationIndicator}
                  {deleteButton !== false && (
                    <DeleteElement
                      index={index}
                      uuid={uuid}
                      isDeletingRow={isDeletingRow}
                      disabled={instanceLocked}
                      deleteButtonText={deleteButtonText}
                      langAsString={langAsString}
                    >
                      {compactButtons ? (isEditingRow ? deleteButtonText : null) : deleteButtonText}
                    </DeleteElement>
                  )}
                </div>
              </Table.Cell>
            )}
            {!displayEditColumn && !displayDeleteColumn && (
              <Table.Cell className={classes.buttonCell}>{validationIndicator}</Table.Cell>
            )}
          </>
        )}
      </Table.Row>
      {!mobileView && (
        <RepeatingGroupTableMessages
          validations={rowValidations.filter((validation) => tableEditingIds.includes(validation.baseComponentId))}
          tableIds={tableIds}
          columnSpan={tableItems.length + columnCount}
          index={index}
          className={isEditingRow ? classes.editingRow : undefined}
        />
      )}
    </>
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
  uuid,
  compactButtons,
  buttonRef,
  disabled,
}: {
  ariaExpanded: boolean;
  indexedId: string;
  uuid: string;
  mobileViewSmall: boolean;
  onClick: () => void;
  editButtonText: string;
  compactButtons: boolean;
  buttonRef?: (node: HTMLButtonElement | null) => void;
  disabled?: boolean;
}) {
  const ariaLabel = useAriaLabel(editButtonText);
  const showText = compactButtons ? ariaExpanded : ariaExpanded || !mobileViewSmall;
  return (
    <Button
      ref={buttonRef}
      data-testid='repeating-group-edit-button'
      aria-expanded={ariaExpanded}
      aria-controls={ariaExpanded ? `group-edit-container-${indexedId}-${uuid}` : undefined}
      variant='tertiary'
      color='second'
      icon={!ariaExpanded && (compactButtons || mobileViewSmall)}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className={classes.tableButton}
    >
      {showText && editButtonText}
      <PencilIcon
        fontSize='1rem'
        aria-hidden='true'
      />
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
        <RepeatingGroupTableField baseComponentId={baseComponentId} />
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
        className={cn(classes.contentFormatting, classes.cellContentFormatting)}
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
