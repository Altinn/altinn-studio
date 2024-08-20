import React from 'react';
import type { JSX } from 'react';

import { Button } from '@digdir/designsystemet-react';
import { Grid } from '@material-ui/core';
import { Back, Delete as DeleteIcon, Next } from '@navikt/ds-icons';
import cn from 'classnames';

import { Lang } from 'src/features/language/Lang';
import { GenericComponent } from 'src/layout/GenericComponent';
import classes from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import { useRepeatingGroup, useRepeatingGroupRowState } from 'src/layout/RepeatingGroup/RepeatingGroupContext';
import {
  RepeatingGroupEditRowProvider,
  useRepeatingGroupEdit,
} from 'src/layout/RepeatingGroup/RepeatingGroupEditContext';
import { useRepeatingGroupsFocusContext } from 'src/layout/RepeatingGroup/RepeatingGroupFocusContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { CompInternal } from 'src/layout/layout';

export interface IRepeatingGroupsEditContainer {
  editId: string;
  className?: string;
  forceHideSaveButton?: boolean;
}

export function RepeatingGroupsEditContainer({ editId, ...props }: IRepeatingGroupsEditContainer): JSX.Element | null {
  const { node } = useRepeatingGroup();
  const group = useNodeItem(node);
  const row = group.rows.find((r) => r && r.uuid === editId);

  if (!row || row.groupExpressions?.hiddenRow) {
    return null;
  }

  return (
    <RepeatingGroupEditRowProvider editId={editId}>
      <RepeatingGroupsEditContainerInternal
        editId={editId}
        group={group}
        row={row}
        {...props}
      />
    </RepeatingGroupEditRowProvider>
  );
}

function RepeatingGroupsEditContainerInternal({
  className,
  editId,
  forceHideSaveButton,
  group,
  row,
}: IRepeatingGroupsEditContainer & {
  group: CompInternal<'RepeatingGroup'>;
  row: CompInternal<'RepeatingGroup'>['rows'][number];
}): JSX.Element | null {
  const { node, closeForEditing, deleteRow, openNextForEditing, isDeleting } = useRepeatingGroup();
  const { visibleRows } = useRepeatingGroupRowState();

  const editingRowIndex = visibleRows.find((r) => r.uuid === editId)?.index;
  let moreVisibleRowsAfterEditIndex = false;
  for (const visibleRow of visibleRows) {
    if (editingRowIndex !== undefined && visibleRow.index > editingRowIndex) {
      moreVisibleRowsAfterEditIndex = true;
      break;
    }
  }

  const { multiPageEnabled, multiPageIndex, nextMultiPage, prevMultiPage, hasNextMultiPage, hasPrevMultiPage } =
    useRepeatingGroupEdit();
  const id = node.id;
  const textsForRow = row?.groupExpressions?.textResourceBindings;
  const editForRow = row?.groupExpressions?.edit;
  const editForGroup = group.edit;
  const rowItems = row?.items;
  const { refSetter } = useRepeatingGroupsFocusContext();
  const texts = {
    ...group.textResourceBindings,
    ...textsForRow,
  };

  const isNested = typeof group.baseComponentId === 'string';
  const saveButtonVisible =
    !forceHideSaveButton &&
    (editForRow?.saveButton !== false || (editForRow.saveAndNextButton === true && !moreVisibleRowsAfterEditIndex));
  const saveAndNextButtonVisible =
    !forceHideSaveButton && editForRow?.saveAndNextButton === true && moreVisibleRowsAfterEditIndex;

  const hideTable = editForGroup?.mode === 'hideTable' || editForGroup?.mode === 'showAll';

  if (!row) {
    return null;
  }

  return (
    <div
      id={`group-edit-container-${id}-${editId}`}
      className={cn(
        isNested ? classes.nestedEditContainer : classes.editContainer,
        { [classes.hideTable]: hideTable, [classes.nestedHideTable]: hideTable && isNested },
        className,
      )}
      style={{ marginBottom: isNested && editForGroup?.mode === 'showAll' ? 15 : undefined }}
      data-testid='group-edit-container'
    >
      {editForRow?.deleteButton !== false && editForGroup?.mode === 'showAll' && (
        <Grid
          item={true}
          container={true}
          direction='column'
          alignItems='flex-end'
          spacing={6}
        >
          <Grid item={true}>
            <Button
              variant='tertiary'
              color='danger'
              size='small'
              disabled={isDeleting(editId)}
              onClick={() => deleteRow({ index: row.index, uuid: row.uuid })}
              data-testid='delete-button'
            >
              <Lang id={'general.delete'} />
              <DeleteIcon fontSize='1rem' />
            </Button>
          </Grid>
        </Grid>
      )}
      <Grid
        container={true}
        item={true}
        direction='row'
        spacing={6}
      >
        <Grid
          container={true}
          alignItems='flex-start'
          item={true}
          spacing={6}
          ref={(n) => refSetter && editingRowIndex !== undefined && refSetter(editingRowIndex, 'editContainer', n)}
        >
          {rowItems?.map((n) => {
            const isOnOtherMultiPage = multiPageEnabled && n.multiPageIndex !== multiPageIndex;
            if (isOnOtherMultiPage) {
              return null;
            }

            if (group.tableColumns && group.tableColumns[n.baseId]?.showInExpandedEdit === false) {
              return null;
            }

            return (
              <GenericComponent
                key={n.id}
                node={n}
              />
            );
          })}
        </Grid>
        <Grid item={true}>
          {editForGroup?.multiPage && (
            <Grid
              container={true}
              direction='row'
              spacing={2}
              style={{ marginBottom: 12 }}
            >
              {hasPrevMultiPage && (
                <Grid item={true}>
                  <Button
                    size='small'
                    variant='tertiary'
                    color='second'
                    onClick={() => prevMultiPage()}
                  >
                    <Back
                      fontSize='1rem'
                      aria-hidden='true'
                    />
                    <Lang id={'general.back'} />
                  </Button>
                </Grid>
              )}
              {hasNextMultiPage && (
                <Grid item={true}>
                  <Button
                    size='small'
                    variant='tertiary'
                    color='second'
                    onClick={() => nextMultiPage()}
                  >
                    <Lang id={'general.next'} />
                    <Next
                      fontSize='1rem'
                      aria-hidden='true'
                    />
                  </Button>
                </Grid>
              )}
            </Grid>
          )}
          <Grid
            container={true}
            direction='row'
            spacing={2}
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
                  id={`save-button-${id}`}
                  onClick={() => closeForEditing({ index: row.index, uuid: row.uuid })}
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
