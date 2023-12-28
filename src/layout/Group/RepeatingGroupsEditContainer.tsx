import React from 'react';

import { Button } from '@digdir/design-system-react';
import { Grid } from '@material-ui/core';
import { Back, Delete as DeleteIcon, Next } from '@navikt/ds-icons';
import cn from 'classnames';

import { Lang } from 'src/features/language/Lang';
import { GenericComponent } from 'src/layout/GenericComponent';
import classes from 'src/layout/Group/RepeatingGroup.module.css';
import { useRepeatingGroup } from 'src/layout/Group/RepeatingGroupContext';
import { RepeatingGroupEditRowProvider, useRepeatingGroupEdit } from 'src/layout/Group/RepeatingGroupsEditContext';
import { useRepeatingGroupsFocusContext } from 'src/layout/Group/RepeatingGroupsFocusContext';
import type { CompGroupRepeatingInternal, IGroupEditPropertiesInternal } from 'src/layout/Group/config.generated';

export interface IRepeatingGroupsEditContainer {
  editIndex: number;
  className?: string;
  forceHideSaveButton?: boolean;
}

export function RepeatingGroupsEditContainer({
  editIndex,
  ...props
}: IRepeatingGroupsEditContainer): JSX.Element | null {
  const { node } = useRepeatingGroup();
  const group = node.item;
  const row = group.rows[editIndex];

  if (!row) {
    return null;
  }

  const shouldHideRow = node.isRepGroup() && node.item.rows[editIndex]?.groupExpressions?.hiddenRow;
  if (shouldHideRow) {
    return null;
  }

  return (
    <RepeatingGroupEditRowProvider
      node={node}
      editIndex={editIndex}
    >
      <RepeatingGroupsEditContainerInternal
        editIndex={editIndex}
        group={group}
        row={row}
        {...props}
      />
    </RepeatingGroupEditRowProvider>
  );
}

function RepeatingGroupsEditContainerInternal({
  className,
  editIndex,
  forceHideSaveButton,
  group,
  row,
}: IRepeatingGroupsEditContainer & {
  group: CompGroupRepeatingInternal;
  row: CompGroupRepeatingInternal['rows'][number];
}): JSX.Element | null {
  const { node, closeForEditing, deleteRow, openNextForEditing, isDeleting, moreVisibleRowsAfterEditIndex } =
    useRepeatingGroup();
  const { multiPageEnabled, multiPageIndex, nextMultiPage, prevMultiPage, hasNextMultiPage, hasPrevMultiPage } =
    useRepeatingGroupEdit();
  const id = node.item.id;
  const textsForRow = row.groupExpressions?.textResourceBindings;
  const editForRow = row.groupExpressions?.edit;
  const editForGroup = group.edit;
  const edit = {
    ...editForGroup,
    ...editForRow,
  } as IGroupEditPropertiesInternal;
  const rowItems = row.items;
  const { refSetter } = useRepeatingGroupsFocusContext();
  const texts = {
    ...group.textResourceBindings,
    ...textsForRow,
  };

  const getGenericComponentsToRender = (): (JSX.Element | null)[] =>
    rowItems.map((n): JSX.Element | null => {
      const isOnOtherMultiPage = multiPageEnabled && n.item.multiPageIndex !== multiPageIndex;

      if (isOnOtherMultiPage) {
        return null;
      }

      if (
        group.tableColumns &&
        n.item.baseComponentId &&
        group.tableColumns[n.item.baseComponentId] &&
        group.tableColumns[n.item.baseComponentId].showInExpandedEdit === false
      ) {
        return null;
      }

      return (
        <GenericComponent
          node={n}
          key={n.item.id}
        />
      );
    });

  const isNested = typeof group.baseComponentId === 'string';
  const saveButtonVisible =
    !forceHideSaveButton &&
    (edit?.saveButton !== false || (edit.saveAndNextButton === true && !moreVisibleRowsAfterEditIndex));
  const saveAndNextButtonVisible =
    !forceHideSaveButton && edit.saveAndNextButton === true && moreVisibleRowsAfterEditIndex;

  const hideTable = edit.mode === 'hideTable' || edit.mode === 'showAll';

  return (
    <div
      id={`group-edit-container-${id}-${editIndex}`}
      className={cn(
        isNested ? classes.nestedEditContainer : classes.editContainer,
        { [classes.hideTable]: hideTable, [classes.nestedHideTable]: hideTable && isNested },
        className,
      )}
      style={{ marginBottom: isNested && edit?.mode === 'showAll' ? 15 : undefined }}
      data-testid='group-edit-container'
    >
      {edit?.deleteButton !== false && edit?.mode === 'showAll' && (
        <Grid
          item={true}
          container={true}
          direction='column'
          alignItems='flex-end'
          spacing={3}
        >
          <Grid item={true}>
            <Button
              variant='tertiary'
              color='danger'
              size='small'
              icon={<DeleteIcon />}
              iconPlacement='right'
              disabled={isDeleting(editIndex)}
              onClick={() => deleteRow(editIndex)}
              data-testid='delete-button'
            >
              <Lang id={'general.delete'} />
            </Button>
          </Grid>
        </Grid>
      )}
      <Grid
        container={true}
        item={true}
        direction='row'
        spacing={3}
      >
        <Grid
          container={true}
          alignItems='flex-start'
          item={true}
          spacing={3}
          ref={(n) => refSetter && refSetter(editIndex, 'editContainer', n)}
        >
          {getGenericComponentsToRender()}
        </Grid>
        <Grid item={true}>
          {edit?.multiPage && (
            <Grid
              container={true}
              direction='row'
              spacing={1}
              style={{ marginBottom: 12 }}
            >
              {hasPrevMultiPage && (
                <Grid item={true}>
                  <Button
                    icon={<Back aria-hidden='true' />}
                    size='small'
                    variant='tertiary'
                    color='second'
                    onClick={() => prevMultiPage()}
                  >
                    <Lang id={'general.back'} />
                  </Button>
                </Grid>
              )}
              {hasNextMultiPage && (
                <Grid item={true}>
                  <Button
                    icon={<Next aria-hidden='true' />}
                    iconPlacement='right'
                    size='small'
                    variant='tertiary'
                    color='second'
                    onClick={() => nextMultiPage()}
                  >
                    <Lang id={'general.next'} />
                  </Button>
                </Grid>
              )}
            </Grid>
          )}
          <Grid
            container={true}
            direction='row'
            spacing={1}
          >
            {saveAndNextButtonVisible && (
              <Grid item={true}>
                <Button
                  id={`next-button-grp-${id}`}
                  onClick={() => openNextForEditing()}
                  variant='primary'
                  color='first'
                  size='small'
                >
                  <Lang id={texts?.save_and_next_button ? texts?.save_and_next_button : 'general.save_and_next'} />
                </Button>
              </Grid>
            )}
            {saveButtonVisible && (
              <Grid item={true}>
                <Button
                  id={`add-button-grp-${id}`}
                  onClick={() => closeForEditing(editIndex)}
                  variant={saveAndNextButtonVisible ? 'secondary' : 'primary'}
                  color='first'
                  size='small'
                >
                  <Lang id={texts?.save_button ? texts?.save_button : 'general.save_and_close'} />
                </Button>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>
    </div>
  );
}
