import React, { forwardRef, useEffect } from 'react';
import type { JSX } from 'react';

import { Button, ConditionalWrapper, Fieldset, Flex, FullWidthWrapper } from '@app/form-component';
import { PlusIcon } from '@navikt/aksel-icons';
import type { ButtonPosition } from '@app/layout-contract/generated/common.generated';

import { FormStore } from 'src/features/form/FormContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { RepeatingGroupsEditContainer } from 'src/layout/RepeatingGroup/EditContainer/RepeatingGroupsEditContainer';
import { RepeatingGroupPagination } from 'src/layout/RepeatingGroup/Pagination/RepeatingGroupPagination';
import {
  RepGroupContext,
  useRepeatingGroupComponentId,
  useRepeatingGroupPagination,
  useRepeatingGroupRowState,
  useRepeatingGroupSelector,
} from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { useRepeatingGroupsFocusContext } from 'src/layout/RepeatingGroup/Providers/RepeatingGroupFocusContext';
import { RepeatingGroupTable } from 'src/layout/RepeatingGroup/Table/RepeatingGroupTable';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import utilClasses from 'src/styles/utils.module.css';
import { DataModelLocationProvider, useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useIsHidden } from 'src/utils/layout/hidden';
import { useDataModelBindingsFor, useExternalItem } from 'src/utils/layout/hooks';
import { useLabel } from 'src/utils/layout/useLabel';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';

export const RepeatingGroupContainer = forwardRef((_, ref: React.ForwardedRef<HTMLDivElement>): JSX.Element | null => {
  const baseComponentId = useRepeatingGroupComponentId();
  const mode = useExternalItem(baseComponentId, 'RepeatingGroup').edit?.mode;

  const editingId = useRepeatingGroupSelector((state) => state.editingId);
  const id = useIndexedId(baseComponentId);
  const isHidden = useIsHidden(baseComponentId);

  if (isHidden) {
    return null;
  }

  return (
    <Flex
      container
      item
      data-componentid={id}
      data-componentbaseid={baseComponentId}
      ref={ref}
    >
      {(!mode || mode === 'showTable') && <ModeOnlyTable />}
      {mode === 'onlyTable' && <ModeOnlyTable />}
      {mode === 'hideTable' && editingId === undefined && <ModeOnlyTable />}
      {mode === 'hideTable' && editingId !== undefined && <ModeOnlyEdit editingId={editingId} />}
      {mode === 'showAll' && <ModeShowAll />}
      <Flex
        item
        size={{ xs: 12 }}
      >
        <AllComponentValidations baseComponentId={baseComponentId} />
      </Flex>
      <RowDeletionAnnouncement />
    </Flex>
  );
});
RepeatingGroupContainer.displayName = 'RepeatingGroupContainer';

function RowDeletionAnnouncement() {
  const { langAsString } = useLanguage();
  const deletedRowsCount = useRepeatingGroupSelector((state) => state.deletedRowsCount);
  const { numVisibleRows } = useRepeatingGroupRowState();
  const [message, setMessage] = React.useState('');

  // Only announce when the count actually increases.
  const lastAnnouncedCount = React.useRef(deletedRowsCount);

  useEffect(() => {
    if (deletedRowsCount <= lastAnnouncedCount.current) {
      return;
    }
    lastAnnouncedCount.current = deletedRowsCount;
    // Include the remaining row count so the message gets re-announced on later deletions
    setMessage(langAsString('group.row_deleted_sr', [numVisibleRows]));
  }, [deletedRowsCount, numVisibleRows, langAsString]);

  return (
    <div
      role='status'
      aria-live='polite'
      className={utilClasses.visuallyHidden}
    >
      {message}
    </div>
  );
}

function ModeOnlyTable() {
  return (
    <>
      <RepeatingGroupTable />
      <AddButton />
    </>
  );
}

function ModeOnlyEdit({ editingId }: { editingId: string }) {
  const baseComponentId = useRepeatingGroupComponentId();
  const parent = FormStore.bootstrap.useLayoutLookups().componentToParent[baseComponentId];
  const isNested = parent?.type === 'node';

  const groupBinding = useDataModelBindingsFor(baseComponentId, 'RepeatingGroup').group;
  const grid = useExternalItem(baseComponentId, 'RepeatingGroup').grid;
  const rowIndex = RepGroupHooks.useAllBaseRows(baseComponentId).find((r) => r.uuid === editingId)?.index;
  const { labelText, getDescriptionComponent, getHelpTextComponent } = useLabel({
    baseComponentId,
    overrideDisplay: undefined,
  });

  if (rowIndex === undefined) {
    return null;
  }

  return (
    <Fieldset
      size='sm'
      grid={grid?.labelGrid}
      legend={labelText}
      description={getDescriptionComponent()}
      help={getHelpTextComponent()}
    >
      <ConditionalWrapper
        condition={!isNested}
        wrapper={(children) => <FullWidthWrapper>{children}</FullWidthWrapper>}
      >
        <DataModelLocationProvider
          groupBinding={groupBinding}
          rowIndex={rowIndex}
        >
          <RepeatingGroupsEditContainer editId={editingId} />
        </DataModelLocationProvider>
      </ConditionalWrapper>
      <AddButton />
    </Fieldset>
  );
}

function ModeShowAll() {
  const baseComponentId = useRepeatingGroupComponentId();
  const parent = FormStore.bootstrap.useLayoutLookups().componentToParent[baseComponentId];
  const isNested = parent?.type === 'node';

  const { rowsToDisplay } = useRepeatingGroupPagination();
  const numRows = rowsToDisplay.length;
  const lastIndex = rowsToDisplay[numRows - 1];

  const groupBinding = useDataModelBindingsFor(baseComponentId, 'RepeatingGroup').group;
  const grid = useExternalItem(baseComponentId, 'RepeatingGroup').grid;
  const { labelText, getDescriptionComponent, getHelpTextComponent } = useLabel({
    baseComponentId,
    overrideDisplay: undefined,
  });

  return (
    <Fieldset
      size='sm'
      grid={grid?.labelGrid}
      legend={labelText}
      description={getDescriptionComponent()}
      help={getHelpTextComponent()}
    >
      <ConditionalWrapper
        condition={!isNested}
        wrapper={(children) => <FullWidthWrapper>{children}</FullWidthWrapper>}
      >
        <>
          {rowsToDisplay.map((row) => (
            <DataModelLocationProvider
              key={`repeating-group-item-${row.uuid}`}
              groupBinding={groupBinding}
              rowIndex={row.index}
            >
              <div style={{ width: '100%', marginBottom: !isNested && row == lastIndex ? 15 : 0 }}>
                <RepeatingGroupsEditContainer
                  editId={row.uuid}
                  forceHideSaveButton={true}
                />
              </div>
            </DataModelLocationProvider>
          ))}
          <RepeatingGroupPagination inTable={false} />
        </>
      </ConditionalWrapper>
      <AddButton />
    </Fieldset>
  );
}

export const alignStyle = (align: ButtonPosition): React.CSSProperties => {
  switch (align) {
    case 'right':
      return { marginLeft: 'auto' };
    case 'center':
      return { margin: '0 auto' };
    default:
      return {};
  }
};

function AddButton() {
  const { lang, langAsString } = useLanguage();
  const { triggerFocus, registerAddButton } = useRepeatingGroupsFocusContext();
  const baseComponentId = useRepeatingGroupComponentId();
  const addRow = RepGroupContext.useAddRow();
  const { visibleRows } = useRepeatingGroupRowState();
  const { editingAll, editingNone, isEditingAnyRow, currentlyAddingRow } = useRepeatingGroupSelector((state) => ({
    editingAll: state.editingAll,
    editingNone: state.editingNone,
    isEditingAnyRow: state.editingId !== undefined,
    currentlyAddingRow: state.addingIds.length > 0,
  }));

  const item = useItemWhenType(baseComponentId, 'RepeatingGroup');
  const { textResourceBindings, id, edit, addButton } = item;
  const { addButton: addButtonText, addButtonFull } = textResourceBindings || {};

  const numRows = visibleRows.length;
  const tooManyRows = 'maxCount' in item && typeof item.maxCount == 'number' && numRows >= item.maxCount;
  const forceShow = editingAll || editingNone || edit?.alwaysShowAddButton === true;

  // Making sure the default width for the add button is full:
  const fullWidth = addButton?.fullWidth === undefined ? true : addButton?.fullWidth;

  const size = addButton?.size === undefined ? 'md' : addButton?.size;

  if (edit?.addButton === false) {
    return null;
  }

  if (tooManyRows) {
    return null;
  }

  if (isEditingAnyRow && !forceShow) {
    return null;
  }

  return (
    <Button
      ref={registerAddButton}
      textAlign={addButton?.textAlign}
      fullWidth={fullWidth}
      id={`add-button-${id}`}
      size={size}
      style={addButton?.position ? { ...alignStyle(addButton?.position) } : {}}
      onClick={async () => {
        const newRow = await addRow();
        newRow.index !== undefined && triggerFocus(newRow.index);
      }}
      variant='secondary'
      disabled={currentlyAddingRow}
    >
      <PlusIcon
        fontSize='1.5rem'
        aria-hidden='true'
      />
      {addButtonFull ? lang(addButtonFull) : `${langAsString('general.add_new')} ${langAsString(addButtonText)}`}
    </Button>
  );
}
