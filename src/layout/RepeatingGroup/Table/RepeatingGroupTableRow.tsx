import React from 'react';
import type { JSX } from 'react';

import { Table } from '@digdir/designsystemet-react';
import { PencilIcon, TrashIcon, XMarkOctagonFillIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { Button } from 'src/app-components/Button/Button';
import { Flex } from 'src/app-components/Flex/Flex';
import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { DeleteWarningPopover } from 'src/features/alertOnChange/DeleteWarningPopover';
import { useAlertOnChange } from 'src/features/alertOnChange/useAlertOnChange';
import { useDisplayDataFor } from 'src/features/displayData/useDisplayData';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { useIndexedComponentIds } from 'src/features/form/layout/utils/makeIndexedId';
import { FD } from 'src/features/formData/FormDataWrite';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useDeepValidationsForNode } from 'src/features/validation/selectors/deepValidationsForNode';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { getComponentDef } from 'src/layout';
import { GenericComponentById } from 'src/layout/GenericComponent';
import { useRepeatingGroup } from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { useRepeatingGroupsFocusContext } from 'src/layout/RepeatingGroup/Providers/RepeatingGroupFocusContext';
import classes from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import { useTableComponentIds } from 'src/layout/RepeatingGroup/useTableComponentIds';
import { useColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import { useDataModelLocationForRow } from 'src/utils/layout/DataModelLocation';
import { NodesInternal, useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { AlertOnChange } from 'src/features/alertOnChange/useAlertOnChange';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { ITableColumnFormatting } from 'src/layout/common.generated';
import type { CompInternal, CompTypes, ITextResourceBindings } from 'src/layout/layout';
import type { CompRepeatingGroupExternal } from 'src/layout/RepeatingGroup/config.generated';
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

export const RepeatingGroupTableRow = React.memo(function RepeatingGroupTableRow({
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
  const freshUuid = FD.useFreshRowUuid(group.dataModelBindings?.group, index);
  const isFresh = freshUuid === uuid;
  const rowExpressions = row?.groupExpressions;
  const editForRow = rowExpressions?.edit;
  const editForGroup = group.edit;
  const trbForRow = rowExpressions?.textResourceBindings;
  const columnSettings = group.tableColumns;

  const alertOnDelete = useAlertOnChange(Boolean(editForRow?.alertOnDelete), deleteRow);

  const nodeDataSelector = NodesInternal.useNodeDataSelector();
  const layoutLookups = useLayoutLookups();
  const dataModelLocation = useDataModelLocationForRow(group.dataModelBindings.group, index);
  const rawTableIds = useTableComponentIds(node);
  const displayData = useDisplayDataFor(rawTableIds, dataModelLocation);
  const tableIds = useIndexedComponentIds(rawTableIds, dataModelLocation);
  const tableItems = rawTableIds.map((baseId, index) => ({
    baseId,
    id: tableIds[index],
    type: layoutLookups.getComponent(baseId).type,
  }));
  const firstCellData = Object.values(displayData).find((c) => !!c);
  const isEditingRow = isEditing(uuid);
  const isDeletingRow = isDeleting(uuid);

  // If the row has errors we should highlight the row, unless the errors are for components that are shown in the table,
  // then the component getting highlighted is enough
  const tableEditingNodeIds = tableItems
    .filter((i) => shouldEditInTable(editForGroup, i.baseId, i.type, columnSettings))
    .map((i) => i.id);
  const rowValidations = useDeepValidationsForNode(node, false, index);
  const rowHasErrors = rowValidations.some(
    (validation) => validation.severity === 'error' && !tableEditingNodeIds.includes(validation.nodeId),
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
        tableItems.map((item) =>
          shouldEditInTable(editForGroup, item.baseId, item.type, columnSettings) ? (
            <Table.Cell
              key={item.id}
              className={classes.tableCell}
            >
              <div ref={(ref) => refSetter && refSetter(index, `component-${item.id}`, ref)}>
                <GenericComponentById
                  id={item.id}
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
              key={item.id}
              nodeId={item.id}
              isEditingRow={isEditingRow}
              displayData={displayData[item.baseId] ?? ''}
              columnSettings={columnSettings}
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
                (shouldEditInTable(editForGroup, item.baseId, item.type, columnSettings) ? (
                  <Flex
                    container
                    item
                    key={item.id}
                    ref={(ref) => refSetter && refSetter(index, `component-${item.id}`, ref)}
                  >
                    <GenericComponentById
                      id={item.id}
                      overrideItemProps={{
                        grid: {},
                      }}
                    />
                  </Flex>
                ) : (
                  <Flex
                    container
                    item
                    key={item.id}
                  >
                    <b className={cn(classes.contentFormatting, classes.spaceAfterContent)}>
                      <Lang
                        id={getTableTitle(
                          nodeDataSelector(
                            (picker) => picker(item.id, item.type)?.item?.textResourceBindings ?? {},
                            [item],
                          ),
                        )}
                      />
                      :
                    </b>
                    <span className={classes.contentFormatting}>{displayData[item.baseId] ?? ''}</span>
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
                <Button
                  aria-expanded={isEditingRow}
                  aria-controls={isEditingRow ? `group-edit-container-${id}-${uuid}` : undefined}
                  variant='tertiary'
                  color='second'
                  onClick={() => toggleEditing({ index: row.index, uuid: row.uuid })}
                  aria-label={`${editButtonText} ${firstCellData ?? ''}`}
                  className={classes.tableButton}
                  disabled={!isFresh}
                >
                  {editButtonText}
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
                  disabled={!isFresh}
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
                icon={!isEditingRow && mobileViewSmall}
                onClick={() => toggleEditing({ index, uuid })}
                aria-label={`${editButtonText} ${firstCellData ?? ''}`}
                className={classes.tableButton}
              >
                {(isEditingRow || !mobileViewSmall) && editButtonText}
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
                  disabled={!isFresh}
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
});

RepeatingGroupTableRow.displayName = 'RepeatingGroupTableRow';

export function shouldEditInTable(
  groupEdit: CompInternal<'RepeatingGroup'>['edit'],
  componentId: string,
  type: CompTypes,
  columnSettings: CompRepeatingGroupExternal['tableColumns'],
) {
  const column = columnSettings && columnSettings[componentId];
  const def = getComponentDef(type);
  if (groupEdit?.mode === 'onlyTable' && column?.editInTable !== false) {
    return def.canRenderInTable();
  }

  if (column && column.editInTable) {
    return def.canRenderInTable();
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
  disabled,
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
  disabled?: boolean;
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
        disabled={isDeletingRow || disabled}
        onClick={() => handleDelete({ index, uuid })}
        aria-label={`${deleteButtonText}-${firstCellData}`}
        icon={!children}
        className={classes.tableButton}
      >
        {children}
        <TrashIcon
          fontSize='1rem'
          aria-hidden='true'
        />
      </Button>
    </ConditionalWrapper>
  );
}

function NonEditableCell({
  nodeId,
  columnSettings,
  isEditingRow,
  displayData,
}: {
  nodeId: string;
  columnSettings: ITableColumnFormatting | undefined;
  displayData: string;
  isEditingRow: boolean;
}) {
  const node = useNode(nodeId);
  if (!node) {
    throw new Error(`Node with id ${nodeId} not found`);
  }

  const style = useColumnStylesRepeatingGroups(node, columnSettings);
  return (
    <Table.Cell className={classes.tableCell}>
      <span
        className={classes.contentFormatting}
        style={style}
      >
        {isEditingRow ? null : displayData}
      </span>
    </Table.Cell>
  );
}
