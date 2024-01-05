import React, { useEffect } from 'react';
import type { MutableRefObject } from 'react';

import { Button } from '@digdir/design-system-react';
import { Grid } from '@material-ui/core';
import { Add as AddIcon } from '@navikt/ds-icons';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { Fieldset } from 'src/components/form/Fieldset';
import { FullWidthWrapper } from 'src/components/form/FullWidthWrapper';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { Triggers } from 'src/layout/common.generated';
import classes from 'src/layout/Group/RepeatingGroupContainer.module.css';
import { useRepeatingGroup } from 'src/layout/Group/RepeatingGroupContext';
import { RepeatingGroupsEditContainer } from 'src/layout/Group/RepeatingGroupsEditContainer';
import { useRepeatingGroupsFocusContext } from 'src/layout/Group/RepeatingGroupsFocusContext';
import { RepeatingGroupTable } from 'src/layout/Group/RepeatingGroupTable';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import type { TriggerList } from 'src/layout/common.generated';

export interface IGroupProps {
  containerDivRef?: MutableRefObject<HTMLDivElement | null>;
}

const getValidationMethod = (triggers: TriggerList) => {
  // Validation for whole group takes precedent over single-row validation if both are present.
  if (triggers.includes(Triggers.Validation)) {
    return Triggers.Validation;
  }
  if (triggers.includes(Triggers.ValidateRow)) {
    return Triggers.ValidateRow;
  }
};

export function RepeatingGroupContainer({ containerDivRef }: IGroupProps): JSX.Element | null {
  const { triggerFocus } = useRepeatingGroupsFocusContext();
  const { node, isEditingAnyRow, editingIndex, addRow, openForEditing, isFirstRender, visibleRowIndexes } =
    useRepeatingGroup();

  const { textResourceBindings, id, edit, type } = node.item;

  const numRows = visibleRowIndexes.length;
  const firstIndex = visibleRowIndexes[0];
  const lastIndex = visibleRowIndexes[numRows - 1];
  const { lang, langAsString } = useLanguage();

  const AddButton = (): JSX.Element => (
    <Button
      id={`add-button-${id}`}
      onClick={handleOnAddButtonClick}
      onKeyUp={handleOnAddKeypress}
      variant='secondary'
      icon={<AddIcon aria-hidden='true' />}
      iconPlacement='left'
      fullWidth
    >
      {textResourceBindings?.add_button_full
        ? lang(textResourceBindings.add_button_full)
        : `${langAsString('general.add_new')} ${langAsString(textResourceBindings?.add_button)}`}
    </Button>
  );

  const handleOnAddButtonClick = async () => {
    await addRow();
    triggerFocus(lastIndex + 1);
  };

  // Add new row if openByDefault is true and no rows exist. This also makes sure to add a row immediately after the
  // last one has been deleted.
  useEffect((): void => {
    if (edit?.openByDefault && numRows === 0) {
      addRow().then();
    }
  }, [node, addRow, edit?.openByDefault, numRows]);

  // Open the first or last row for editing, if openByDefault is set to 'first' or 'last'
  useEffect((): void => {
    if (
      isFirstRender &&
      edit?.openByDefault &&
      typeof edit.openByDefault === 'string' &&
      ['first', 'last'].includes(edit.openByDefault) &&
      editingIndex === undefined
    ) {
      const index = edit.openByDefault === 'last' ? lastIndex : firstIndex;
      openForEditing(index);
    }
  }, [edit?.openByDefault, editingIndex, isFirstRender, firstIndex, lastIndex, openForEditing]);

  const handleOnAddKeypress = async (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const allowedKeys = ['enter', ' ', 'spacebar'];
    if (allowedKeys.includes(event.key.toLowerCase())) {
      await addRow();
      triggerFocus(lastIndex + 1);
    }
  };

  if (node.isHidden() || type !== 'Group') {
    return null;
  }

  const isNested = node.parent instanceof BaseLayoutNode;

  const displayBtn =
    edit?.addButton !== false &&
    numRows < node.item.maxCount &&
    (edit?.mode === 'showAll' || !isEditingAnyRow || edit?.alwaysShowAddButton === true);

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
      {edit?.mode !== 'showAll' && displayBtn && <AddButton />}
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
              legend={textResourceBindings?.title && <Lang id={textResourceBindings?.title} />}
              description={
                textResourceBindings?.description && (
                  <span className={classes.showAllDescription}>
                    <Lang id={textResourceBindings?.description} />
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
      {edit?.mode === 'showAll' && displayBtn && <AddButton />}
      <Grid
        item={true}
        xs={12}
      >
        {node.getValidations('group') && renderValidationMessagesForComponent(node.getValidations('group'), id)}
      </Grid>
    </Grid>
  );
}
