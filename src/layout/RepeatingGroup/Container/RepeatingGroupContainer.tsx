import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { PlusIcon } from '@navikt/aksel-icons';

import { Button } from 'src/app-components/Button/Button';
import { ConditionalWrapper } from 'src/app-components/ConditionalWrapper/ConditionalWrapper';
import { Flex } from 'src/app-components/Flex/Flex';
import { FullWidthWrapper } from 'src/app-components/FullWidthWrapper/FullWidthWrapper';
import { Fieldset } from 'src/app-components/Label/Fieldset';
import { useLanguage } from 'src/features/language/useLanguage';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { RepeatingGroupsEditContainer } from 'src/layout/RepeatingGroup/EditContainer/RepeatingGroupsEditContainer';
import { RepeatingGroupPagination } from 'src/layout/RepeatingGroup/Pagination/RepeatingGroupPagination';
import {
  useRepeatingGroup,
  useRepeatingGroupPagination,
  useRepeatingGroupRowState,
  useRepeatingGroupSelector,
} from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { useRepeatingGroupsFocusContext } from 'src/layout/RepeatingGroup/Providers/RepeatingGroupFocusContext';
import { RepeatingGroupTable } from 'src/layout/RepeatingGroup/Table/RepeatingGroupTable';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { DataModelLocationProvider } from 'src/utils/layout/DataModelLocation';
import { LayoutNode } from 'src/utils/layout/LayoutNode';
import { Hidden } from 'src/utils/layout/NodesContext';
import { useLabel } from 'src/utils/layout/useLabel';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { ButtonPosition } from 'src/layout/common.generated';

export const RepeatingGroupContainer = forwardRef((_, ref: React.ForwardedRef<HTMLDivElement>): JSX.Element | null => {
  const { node } = useRepeatingGroup();
  const mode = useNodeItem(node, (i) => i.edit?.mode);

  const editingId = useRepeatingGroupSelector((state) => state.editingId);
  const isHidden = Hidden.useIsHidden(node);

  if (isHidden || !node.isType('RepeatingGroup')) {
    return null;
  }

  return (
    <Flex
      container
      item
      data-componentid={node.id}
      data-componentbaseid={node.baseId}
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
        <AllComponentValidations node={node} />
      </Flex>
    </Flex>
  );
});
RepeatingGroupContainer.displayName = 'RepeatingGroupContainer';

function ModeOnlyTable() {
  return (
    <>
      <RepeatingGroupTable />
      <AddButton />
    </>
  );
}

function ModeOnlyEdit({ editingId }: { editingId: string }) {
  const { node } = useRepeatingGroup();
  const isNested = node.parent instanceof LayoutNode;

  const groupBinding = useNodeItem(node, (i) => i.dataModelBindings.group);
  const grid = useNodeItem(node, (i) => i.grid);
  const rowIndex = RepGroupHooks.useAllBaseRows(node).find((r) => r.uuid === editingId)?.index;
  const { labelText, getDescriptionComponent, getHelpTextComponent } = useLabel({ node, overrideDisplay: undefined });

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
  const { node } = useRepeatingGroup();
  const isNested = node.parent instanceof LayoutNode;

  const { rowsToDisplay } = useRepeatingGroupPagination();
  const numRows = rowsToDisplay.length;
  const lastIndex = rowsToDisplay[numRows - 1];

  const groupBinding = useNodeItem(node, (i) => i.dataModelBindings.group);
  const grid = useNodeItem(node, (i) => i.grid);
  const { labelText, getDescriptionComponent, getHelpTextComponent } = useLabel({ node, overrideDisplay: undefined });

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
  const { triggerFocus } = useRepeatingGroupsFocusContext();
  const { node, addRow } = useRepeatingGroup();
  const { visibleRows } = useRepeatingGroupRowState();
  const { editingAll, editingNone, isEditingAnyRow, currentlyAddingRow } = useRepeatingGroupSelector((state) => ({
    editingAll: state.editingAll,
    editingNone: state.editingNone,
    isEditingAnyRow: state.editingId !== undefined,
    currentlyAddingRow: state.addingIds.length > 0,
  }));

  const item = useNodeItem(node);
  const { textResourceBindings, id, edit, addButton } = item;
  const { add_button, add_button_full } = textResourceBindings || {};

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
      textAlign={addButton?.textAlign}
      fullWidth={fullWidth}
      id={`add-button-${id}`}
      size={size}
      style={addButton?.position ? { ...alignStyle(addButton?.position) } : {}}
      onClick={async () => {
        const newRow = await addRow();
        newRow.index !== undefined && triggerFocus(newRow.index);
      }}
      onKeyUp={async (event: React.KeyboardEvent<HTMLButtonElement>) => {
        const allowedKeys = ['enter', ' ', 'spacebar'];
        if (allowedKeys.includes(event.key.toLowerCase())) {
          const newRow = await addRow();
          newRow.index !== undefined && triggerFocus(newRow.index);
        }
      }}
      variant='secondary'
      disabled={currentlyAddingRow}
    >
      <PlusIcon
        fontSize='1.5rem'
        aria-hidden='true'
      />
      {add_button_full ? lang(add_button_full) : `${langAsString('general.add_new')} ${langAsString(add_button)}`}
    </Button>
  );
}
