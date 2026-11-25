import type { JSX, ReactNode } from 'react';

import { BaseTable, Button, Flex, useIsMobile } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { PencilIcon, TrashIcon } from '@navikt/aksel-icons';
import cn from 'classnames';
import type { ITableColumnFormatting } from '@app/layout-contract/generated/common.generated';
import type {
  CompRepeatingGroupExternal,
  IGroupEditProperties,
} from '@app/layout-contract/generated/components/RepeatingGroup/config.generated';

import { DeleteWarningPopover } from 'src/features/alertOnChange/DeleteWarningPopover';
import { useAlertOnChange } from 'src/features/alertOnChange/useAlertOnChange';
import { useDisplayData } from 'src/features/displayData/useDisplayData';
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
  RepeatingGroupMessagePanel,
  RepeatingGroupTableField,
} from 'src/layout/RepeatingGroup/Table/RepeatingGroupTableValidation';
import { useRowAriaLabel } from 'src/layout/RepeatingGroup/Table/useRowAriaLabel';
import { getHighestSeverity } from 'src/layout/RepeatingGroup/Table/validationSeverity';
import { useColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { NodeRefValidation, ValidationSeverity } from 'src/features/validation';
import type { CompTypes } from 'src/layout/layout';
import type { RepeatingGroupPanelMessage } from 'src/layout/RepeatingGroup/Table/RepeatingGroupTableValidation';

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

/** A stacked mobile row has one cell for its fields and one for its actions. */
const MOBILE_ROW_CELL_COUNT = 2;

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
  const ownerIndexedId = useIndexedId(baseComponentId, true);
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
  const editableIds = new Set(
    tableItems
      .filter((item) => shouldEditInTable(config.edit?.mode, item.baseId, item.type, config.tableColumns))
      .map((item) => item.baseId),
  );
  const panelMessages = getPanelMessages({
    rowValidations,
    editableIds,
    mobileView,
    showsRowObjectMessages: config.edit?.mode === 'onlyTable' || editableIds.size > 0,
    groupNodeId: ownerIndexedId,
  });
  const panelSeverity = getHighestSeverity(panelMessages.map(({ validation }) => validation));
  const mobileTableItems = tableItems.filter(
    (item) =>
      !isEditingRow ||
      config.edit?.mode === 'onlyTable' ||
      (editableIds.has(item.baseId) && config.tableColumns?.[item.baseId]?.showInExpandedEdit === false),
  );
  // Keep the existing background highlight for errors outside directly editable cells.
  const rowHasErrors = rowValidations.some(
    (validation) => validation.severity === 'error' && !editableIds.has(validation.baseComponentId),
  );
  const editButtonText = getEditButtonText(isEditingRow, langTools, editButtonOpen, editButtonClose);
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

  const stackedActions = mobileView || useVerticalButtonLayout;
  const deleteButtonText = langAsString('general.delete');
  const toggleDeletebuttonText = isEditingRow || !mobileViewSmall ? deleteButtonText : null;
  const deleteElement = deleteButton !== false && displayDeleteColumn && (
    <DeleteElement
      index={index}
      uuid={uuid}
      isDeletingRow={isDeletingRow}
      disabled={instanceLocked}
      deleteButtonText={deleteButtonText}
      langAsString={langAsString}
    >
      {compactButtons
        ? isEditingRow
          ? deleteButtonText
          : null
        : stackedActions
          ? toggleDeletebuttonText
          : deleteButtonText}
    </DeleteElement>
  );

  return (
    <>
      <BaseTable.Row
        ref={(node) => refSetter(index, 'row', node)}
        error={rowHasErrors}
        className={cn({ [classes.mobileRow]: mobileView }, className)}
        data-row-num={index}
        data-row-uuid={uuid}
      >
        {!mobileView ? (
          tableItems.map((item) =>
            editableIds.has(item.baseId) ? (
              <EditableCell
                key={item.baseId}
                index={index}
                refSetter={refSetter}
                baseComponentId={item.baseId}
                columnSettings={config.tableColumns}
                panelSeverity={panelSeverity}
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
          <BaseTable.Cell className={classes.mobileTableCell}>
            <Flex
              container
              spacing={6}
            >
              {mobileTableItems.map((item, i, { length }) =>
                editableIds.has(item.baseId) ? (
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
          </BaseTable.Cell>
        ) : null}
        <RowActionCells
          stacked={stackedActions}
          mobileView={mobileView}
          verticalLayout={useVerticalButtonLayout}
          displayEditColumn={displayEditColumn}
          displayDeleteColumn={displayDeleteColumn}
          validationIndicator={<RepeatingGroupRowValidation validations={rowValidations} />}
          editElement={editElement}
          deleteElement={deleteElement}
        />
      </BaseTable.Row>
      <RepeatingGroupMessagePanel
        messages={panelMessages}
        columnSpan={mobileView ? MOBILE_ROW_CELL_COUNT : tableItems.length + columnCount}
        index={index}
        className={isEditingRow ? classes.editingRow : undefined}
      />
    </>
  );
}

/**
 * Field messages are the ones their own component renders in a table cell, so the panel's copy is only visual.
 * Row-object messages have no cell copy, so the panel is where screen readers read them.
 */
function getPanelMessages({
  rowValidations,
  editableIds,
  mobileView,
  showsRowObjectMessages,
  groupNodeId,
}: {
  rowValidations: NodeRefValidation[];
  editableIds: Set<string>;
  mobileView: boolean;
  showsRowObjectMessages: boolean;
  groupNodeId: string;
}): RepeatingGroupPanelMessage[] {
  return rowValidations.flatMap((validation): RepeatingGroupPanelMessage[] => {
    if (!mobileView && editableIds.has(validation.baseComponentId)) {
      return [{ validation, renderedInTableCell: true }];
    }
    const isRowObjectMessage =
      showsRowObjectMessages && validation.nodeId === groupNodeId && validation.repeatingGroupRow;
    return isRowObjectMessage ? [{ validation, renderedInTableCell: false }] : [];
  });
}

function RowActionCells({
  stacked,
  mobileView,
  verticalLayout,
  displayEditColumn,
  displayDeleteColumn,
  validationIndicator,
  editElement,
  deleteElement,
}: {
  stacked: boolean;
  mobileView: boolean;
  verticalLayout: boolean;
  displayEditColumn: boolean;
  displayDeleteColumn: boolean;
  validationIndicator: ReactNode;
  editElement: ReactNode;
  deleteElement: ReactNode;
}) {
  if (stacked) {
    return (
      <BaseTable.ButtonCell
        className={cn({ [classes.mobileTableCell]: mobileView })}
        style={mobileView ? { verticalAlign: 'top' } : undefined}
      >
        <div className={cn(classes.rowActions, { [classes.verticalActions]: verticalLayout && !mobileView })}>
          {validationIndicator}
          {editElement}
          {deleteElement}
        </div>
      </BaseTable.ButtonCell>
    );
  }

  return (
    <>
      {displayEditColumn && (
        <BaseTable.ButtonCell>
          <div className={classes.rowActions}>
            {validationIndicator}
            {editElement}
          </div>
        </BaseTable.ButtonCell>
      )}
      {displayDeleteColumn && (
        <BaseTable.ButtonCell>
          <div className={classes.rowActions}>
            {!displayEditColumn && validationIndicator}
            {deleteElement}
          </div>
        </BaseTable.ButtonCell>
      )}
      {!displayEditColumn && !displayDeleteColumn && <BaseTable.ButtonCell>{validationIndicator}</BaseTable.ButtonCell>}
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
  const ariaLabel = useRowAriaLabel(editButtonText);
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
  children: ReactNode;
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
  const ariaLabel = useRowAriaLabel(deleteButtonText);
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
  panelSeverity,
}: {
  baseComponentId: string;
  columnSettings: ITableColumnFormatting | undefined;
  index: number;
  panelSeverity: ValidationSeverity | undefined;
  refSetter: ((index: number, id: string, ref: HTMLDivElement | null) => void) | undefined;
}) {
  const style = useColumnStylesRepeatingGroups(baseComponentId, columnSettings);

  return (
    <BaseTable.Cell className={classes.tableCell}>
      <div
        className={cn(classes.contentFormatting, classes.contentFormattingEditable)}
        style={style}
        ref={(ref) => refSetter && refSetter(index, `component-${baseComponentId}`, ref)}
      >
        <RepeatingGroupTableField
          baseComponentId={baseComponentId}
          panelSeverity={panelSeverity}
        />
      </div>
    </BaseTable.Cell>
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
    <BaseTable.Cell className={classes.tableCell}>
      <span
        className={cn(classes.contentFormatting, classes.cellContentFormatting)}
        style={style}
      >
        {isEditingRow ? null : <DisplayData baseComponentId={baseComponentId} />}
      </span>
    </BaseTable.Cell>
  );
}

function TableTitle({ baseComponentId }: { baseComponentId: string; compType: CompTypes }) {
  const title = useTableTitle(baseComponentId);
  return <Lang id={title} />;
}

function DisplayData({ baseComponentId }: { baseComponentId: string }) {
  return useDisplayData(baseComponentId);
}
