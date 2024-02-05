import React from 'react';
import type { MutableRefObject } from 'react';

import { Button } from '@digdir/design-system-react';
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
import { RepeatingGroupsEditContainer } from 'src/layout/RepeatingGroup/RepeatingGroupsEditContainer';
import { RepeatingGroupTable } from 'src/layout/RepeatingGroup/RepeatingGroupTable';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';

interface RepeatingGroupContainerProps {
  containerDivRef?: MutableRefObject<HTMLDivElement | null>;
}

export function RepeatingGroupContainer({ containerDivRef }: RepeatingGroupContainerProps): JSX.Element | null {
  const { node, visibleRowIndexes } = useRepeatingGroup();
  const { editingIndex } = useRepeatingGroupSelector((state) => ({
    editingIndex: state.editingIndex,
  }));
  const isEditingAnyRow = editingIndex !== undefined;

  const { textResourceBindings, edit, type } = node.item;
  const { title, description } = textResourceBindings || {};

  const numRows = visibleRowIndexes.length;
  const lastIndex = visibleRowIndexes[numRows - 1];
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
      ref={containerDivRef}
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
          {isEditingAnyRow && editingIndex !== undefined && edit?.mode === 'hideTable' && (
            <RepeatingGroupsEditContainer editIndex={editingIndex} />
          )}
          {edit?.mode === 'showAll' && (
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
              {visibleRowIndexes.map((index) => (
                <div
                  key={`repeating-group-item-${index}`}
                  style={{ width: '100%', marginBottom: !isNested && index == lastIndex ? 15 : 0 }}
                >
                  <RepeatingGroupsEditContainer
                    editIndex={index}
                    forceHideSaveButton={true}
                  />
                </div>
              ))}
            </Fieldset>
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
}

function AddButton() {
  const { lang, langAsString } = useLanguage();
  const { triggerFocus } = useRepeatingGroupsFocusContext();
  const { node, addRow, visibleRowIndexes } = useRepeatingGroup();
  const { editingAll, editingNone, editingIndex, currentlyAddingRow } = useRepeatingGroupSelector((state) => ({
    editingAll: state.editingAll,
    editingNone: state.editingNone,
    editingIndex: state.editingIndex,
    currentlyAddingRow: state.addingIndexes.length > 0,
  }));
  const isEditingAnyRow = editingIndex !== undefined;

  const { textResourceBindings, id, edit } = node.item;
  const { add_button, add_button_full } = textResourceBindings || {};

  const numRows = visibleRowIndexes.length;
  const lastIndex = visibleRowIndexes[numRows - 1];

  const tooManyRows = 'maxCount' in node.item && typeof node.item.maxCount == 'number' && numRows >= node.item.maxCount;
  const forceShow = editingAll || editingNone || edit?.alwaysShowAddButton === true;

  if (edit?.addButton === false) {
    return null;
  }

  if ((tooManyRows || isEditingAnyRow) && !forceShow) {
    return null;
  }

  return (
    <Button
      id={`add-button-${id}`}
      onClick={async () => {
        await addRow();
        triggerFocus(lastIndex + 1);
      }}
      onKeyUp={async (event: React.KeyboardEvent<HTMLButtonElement>) => {
        const allowedKeys = ['enter', ' ', 'spacebar'];
        if (allowedKeys.includes(event.key.toLowerCase())) {
          await addRow();
          triggerFocus(lastIndex + 1);
        }
      }}
      variant='secondary'
      disabled={currentlyAddingRow}
      icon={<AddIcon aria-hidden='true' />}
      iconPlacement='left'
      fullWidth
    >
      {add_button_full ? lang(add_button_full) : `${langAsString('general.add_new')} ${langAsString(add_button)}`}
    </Button>
  );
}
