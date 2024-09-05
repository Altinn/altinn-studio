import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { Button } from '@digdir/designsystemet-react';
import { Grid } from '@material-ui/core';
import { Add as AddIcon } from '@navikt/ds-icons';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { Fieldset } from 'src/components/form/Fieldset';
import { FullWidthWrapper } from 'src/components/form/FullWidthWrapper';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import classes from 'src/layout/RepeatingGroup/Container/RepeatingGroupContainer.module.css';
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
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import { Hidden } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';

export const RepeatingGroupContainer = forwardRef((_, ref: React.ForwardedRef<HTMLDivElement>): JSX.Element | null => {
  const { node } = useRepeatingGroup();
  const { rowsToDisplay } = useRepeatingGroupPagination();
  const { editingId } = useRepeatingGroupSelector((state) => ({
    editingId: state.editingId,
  }));
  const isEditingAnyRow = editingId !== undefined;

  const { textResourceBindings, edit, type } = useNodeItem(node);
  const { title, description } = textResourceBindings || {};

  const numRows = rowsToDisplay.length;
  const lastIndex = rowsToDisplay[numRows - 1];
  const validations = useUnifiedValidationsForNode(node);
  const isHidden = Hidden.useIsHidden(node);

  if (isHidden || type !== 'RepeatingGroup') {
    return null;
  }

  const isNested = node.parent instanceof BaseLayoutNode;

  return (
    <Grid
      container={true}
      item={true}
      data-componentid={node.id}
      data-componentbaseid={node.baseId}
      ref={ref}
    >
      {(!edit?.mode ||
        edit?.mode === 'showTable' ||
        edit?.mode === 'onlyTable' ||
        (edit?.mode === 'hideTable' && !isEditingAnyRow)) && <RepeatingGroupTable />}
      {edit?.mode !== 'showAll' && <AddButton />}
      <ConditionalWrapper
        condition={!isNested}
        wrapper={(children) => <FullWidthWrapper>{children}</FullWidthWrapper>}
      >
        <>
          {isEditingAnyRow && editingId !== undefined && edit?.mode === 'hideTable' && (
            <RepeatingGroupsEditContainer editId={editingId} />
          )}
          {edit?.mode === 'showAll' && (
            <>
              <Fieldset
                legend={title && <Lang id={title} />}
                description={
                  description && (
                    <span className={classes.showAllDescription}>
                      <Lang id={description} />
                    </span>
                  )
                }
                className={classes.showAllFieldset}
              >
                {rowsToDisplay.map((row) => (
                  <div
                    key={`repeating-group-item-${row.uuid}`}
                    style={{ width: '100%', marginBottom: !isNested && row == lastIndex ? 15 : 0 }}
                  >
                    <RepeatingGroupsEditContainer
                      editId={row.uuid}
                      forceHideSaveButton={true}
                    />
                  </div>
                ))}
              </Fieldset>
              <RepeatingGroupPagination inTable={false} />
            </>
          )}
        </>
      </ConditionalWrapper>
      {edit?.mode === 'showAll' && <AddButton />}
      <Grid
        item={true}
        xs={12}
      >
        <ComponentValidations validations={validations} />
      </Grid>
    </Grid>
  );
});
RepeatingGroupContainer.displayName = 'RepeatingGroupContainer';

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
  const { textResourceBindings, id, edit } = item;
  const { add_button, add_button_full } = textResourceBindings || {};

  const numRows = visibleRows.length;
  const tooManyRows = 'maxCount' in item && typeof item.maxCount == 'number' && numRows >= item.maxCount;
  const forceShow = editingAll || editingNone || edit?.alwaysShowAddButton === true;

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
      id={`add-button-${id}`}
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
      fullWidth
    >
      <AddIcon
        fontSize='1.5rem'
        aria-hidden='true'
      />
      {add_button_full ? lang(add_button_full) : `${langAsString('general.add_new')} ${langAsString(add_button)}`}
    </Button>
  );
}
