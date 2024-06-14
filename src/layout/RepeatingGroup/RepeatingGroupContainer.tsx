import React, { forwardRef } from 'react';

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
import classes from 'src/layout/RepeatingGroup/RepeatingGroupContainer.module.css';
import { useRepeatingGroup, useRepeatingGroupSelector } from 'src/layout/RepeatingGroup/RepeatingGroupContext';
import { useRepeatingGroupsFocusContext } from 'src/layout/RepeatingGroup/RepeatingGroupFocusContext';
import { RepeatingGroupPagination } from 'src/layout/RepeatingGroup/RepeatingGroupPagination';
import { RepeatingGroupsEditContainer } from 'src/layout/RepeatingGroup/RepeatingGroupsEditContainer';
import { RepeatingGroupTable } from 'src/layout/RepeatingGroup/RepeatingGroupTable';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';

export const RepeatingGroupContainer = forwardRef((_, ref: React.ForwardedRef<HTMLDivElement>): JSX.Element | null => {
  const { node, rowsToDisplay } = useRepeatingGroup();
  const { editingId } = useRepeatingGroupSelector((state) => ({
    editingId: state.editingId,
  }));
  const isEditingAnyRow = editingId !== undefined;

  const { textResourceBindings, edit, type } = node.item;
  const { title, description } = textResourceBindings || {};

  const numRows = rowsToDisplay.length;
  const lastIndex = rowsToDisplay[numRows - 1];
  const validations = useUnifiedValidationsForNode(node);

  if (node.isHidden() || type !== 'RepeatingGroup') {
    return null;
  }

  const isNested = node.parent instanceof BaseLayoutNode;

  return (
    <Grid
      container={true}
      item={true}
      data-componentid={node.item.id}
      data-componentbaseid={node.item.baseComponentId || node.item.id}
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
        <ComponentValidations
          validations={validations}
          node={node}
        />
      </Grid>
    </Grid>
  );
});
RepeatingGroupContainer.displayName = 'RepeatingGroupContainer';

function AddButton() {
  const { lang, langAsString } = useLanguage();
  const { triggerFocus } = useRepeatingGroupsFocusContext();
  const { node, addRow, visibleRows } = useRepeatingGroup();
  const { editingAll, editingNone, editingId, currentlyAddingRow } = useRepeatingGroupSelector((state) => ({
    editingAll: state.editingAll,
    editingNone: state.editingNone,
    editingId: state.editingId,
    currentlyAddingRow: state.addingIds.length > 0,
  }));
  const isEditingAnyRow = editingId !== undefined;

  const { textResourceBindings, id, edit } = node.item;
  const { add_button, add_button_full } = textResourceBindings || {};

  const numRows = visibleRows.length;
  const tooManyRows = 'maxCount' in node.item && typeof node.item.maxCount == 'number' && numRows >= node.item.maxCount;
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
