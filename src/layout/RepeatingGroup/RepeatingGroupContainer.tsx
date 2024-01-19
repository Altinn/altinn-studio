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
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import classes from 'src/layout/RepeatingGroup/RepeatingGroupContainer.module.css';
import { useRepeatingGroup } from 'src/layout/RepeatingGroup/RepeatingGroupContext';
import { useRepeatingGroupsFocusContext } from 'src/layout/RepeatingGroup/RepeatingGroupFocusContext';
import { RepeatingGroupsEditContainer } from 'src/layout/RepeatingGroup/RepeatingGroupsEditContainer';
import { RepeatingGroupTable } from 'src/layout/RepeatingGroup/RepeatingGroupTable';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';

interface RepeatingGroupContainerProps {
  containerDivRef?: MutableRefObject<HTMLDivElement | null>;
}

export function RepeatingGroupContainer({ containerDivRef }: RepeatingGroupContainerProps): JSX.Element | null {
  const { triggerFocus } = useRepeatingGroupsFocusContext();
  const { node, isEditingAnyRow, editingIndex, addRow, openForEditing, isFirstRender, visibleRowIndexes } =
    useRepeatingGroup();
  const { textResourceBindings, id, edit, type } = node.item;
  const { title, description, add_button, add_button_full } = textResourceBindings || {};

  const numRows = visibleRowIndexes.length;
  const firstIndex = visibleRowIndexes[0];
  const lastIndex = visibleRowIndexes[numRows - 1];
  const { lang, langAsString } = useLanguage();
  const validations = useUnifiedValidationsForNode(node);

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
      {add_button_full ? lang(add_button_full) : `${langAsString('general.add_new')} ${langAsString(add_button)}`}
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

  if (node.isHidden() || type !== 'RepeatingGroup') {
    return null;
  }

  const isNested = node.parent instanceof BaseLayoutNode;

  const tooManyRows = 'maxCount' in node.item && typeof node.item.maxCount == 'number' && numRows >= node.item.maxCount;
  const displayBtn =
    edit?.addButton !== false &&
    !tooManyRows &&
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
      {edit?.mode === 'showAll' && displayBtn && <AddButton />}
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
