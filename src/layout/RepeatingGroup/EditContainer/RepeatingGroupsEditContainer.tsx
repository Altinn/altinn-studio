import React from 'react';
import type { JSX } from 'react';

import { Grid } from '@material-ui/core';
import { Back, Delete as DeleteIcon, Next } from '@navikt/ds-icons';
import cn from 'classnames';

import { Button } from 'src/app-components/button/Button';
import { FD } from 'src/features/formData/FormDataWrite';
import { Lang } from 'src/features/language/Lang';
import { GenericComponent } from 'src/layout/GenericComponent';
import {
  RepeatingGroupEditRowProvider,
  useRepeatingGroupEdit,
} from 'src/layout/RepeatingGroup/EditContainer/RepeatingGroupEditContext';
import {
  useRepeatingGroup,
  useRepeatingGroupRowState,
} from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { useRepeatingGroupsFocusContext } from 'src/layout/RepeatingGroup/Providers/RepeatingGroupFocusContext';
import classes from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import { useNode } from 'src/utils/layout/NodesContext';
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
    <RepeatingGroupEditRowProvider>
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
  const { refSetter } = useRepeatingGroupsFocusContext();
  const texts = {
    ...group.textResourceBindings,
    ...textsForRow,
  };

  const freshUuid = FD.useFreshRowUuid(group.dataModelBindings?.group, row?.index);
  const isFresh = freshUuid === editId;

  const isNested = typeof group.baseComponentId === 'string';
  let saveButtonVisible =
    !forceHideSaveButton &&
    (editForRow?.saveButton !== false || (editForRow.saveAndNextButton === true && !moreVisibleRowsAfterEditIndex));
  const saveAndNextButtonVisible =
    !forceHideSaveButton && editForRow?.saveAndNextButton === true && moreVisibleRowsAfterEditIndex;

  if (editForGroup?.mode === 'hideTable' && !saveButtonVisible && !saveAndNextButtonVisible) {
    // If the save button was not visible in this mode, it would not be
    // possible to exit the edit mode. Therefore, we force it to be visible.
    saveButtonVisible = true;
  }

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
          {row?.itemIds?.map((nodeId) => (
            <ChildComponent
              key={nodeId}
              nodeId={nodeId}
              multiPageIndex={multiPageIndex}
              multiPageEnabled={multiPageEnabled}
              tableColumns={group.tableColumns}
            />
          ))}
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
                    variant='tertiary'
                    color='second'
                    onClick={() => prevMultiPage()}
                    disabled={!isFresh}
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
                    variant='tertiary'
                    color='second'
                    onClick={() => nextMultiPage()}
                    disabled={!isFresh}
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
                  disabled={!isFresh}
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
                  disabled={!isFresh}
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

function ChildComponent({
  nodeId,
  multiPageIndex,
  multiPageEnabled,
  tableColumns,
}: {
  nodeId: string;
  multiPageEnabled: boolean;
  multiPageIndex: number | undefined;
  tableColumns: CompInternal<'RepeatingGroup'>['tableColumns'] | undefined;
}) {
  const node = useNode(nodeId);
  if (!node) {
    return null;
  }

  const isOnOtherMultiPage = multiPageEnabled && node.multiPageIndex !== multiPageIndex;
  if (isOnOtherMultiPage) {
    return null;
  }

  if (tableColumns && tableColumns[node.baseId]?.showInExpandedEdit === false) {
    return null;
  }

  return (
    <GenericComponent
      key={node.id}
      node={node}
    />
  );
}
