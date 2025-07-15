import React from 'react';
import type { JSX } from 'react';

import { ChevronLeftIcon, ChevronRightIcon, TrashIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { Button } from 'src/app-components/Button/Button';
import { Flex } from 'src/app-components/Flex/Flex';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { Lang } from 'src/features/language/Lang';
import { GenericComponent } from 'src/layout/GenericComponent';
import {
  RepeatingGroupEditRowProvider,
  useRepeatingGroupEdit,
} from 'src/layout/RepeatingGroup/EditContainer/RepeatingGroupEditContext';
import {
  useRepeatingGroup,
  useRepeatingGroupComponentId,
  useRepeatingGroupRowState,
} from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { useRepeatingGroupsFocusContext } from 'src/layout/RepeatingGroup/Providers/RepeatingGroupFocusContext';
import classes from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { RepGroupRow } from 'src/layout/RepeatingGroup/utils';

export interface IRepeatingGroupsEditContainer {
  editId: string;
  className?: string;
  forceHideSaveButton?: boolean;
}

export function RepeatingGroupsEditContainer({ editId, ...props }: IRepeatingGroupsEditContainer): JSX.Element | null {
  const baseComponentId = useRepeatingGroupComponentId();
  const rows = RepGroupHooks.useVisibleRows(baseComponentId);
  const row = rows.find((r) => r && r.uuid === editId);
  if (!row) {
    return null;
  }

  return (
    <RepeatingGroupEditRowProvider>
      <RepeatingGroupsEditContainerInternal
        editId={editId}
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
  row,
}: IRepeatingGroupsEditContainer & {
  row: RepGroupRow;
}): JSX.Element | null {
  const { baseComponentId, closeForEditing, deleteRow, openNextForEditing, isDeleting } = useRepeatingGroup();
  const { visibleRows } = useRepeatingGroupRowState();
  const childIds = RepGroupHooks.useChildIdsWithMultiPage(baseComponentId);

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
  const id = useIndexedId(baseComponentId);
  const rowWithExpressions = RepGroupHooks.useRowWithExpressions(baseComponentId, { uuid: row.uuid });
  const textsForRow = rowWithExpressions?.textResourceBindings;
  const editForRow = rowWithExpressions?.edit;
  const { textResourceBindings, edit: editForGroup, tableColumns } = useItemWhenType(baseComponentId, 'RepeatingGroup');
  const { refSetter } = useRepeatingGroupsFocusContext();
  const texts = {
    ...textResourceBindings,
    ...textsForRow,
  };

  const parent = useLayoutLookups().componentToParent[baseComponentId];
  const isNested = parent?.type === 'node';
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
        <Flex
          item
          container
          direction='column'
          alignItems='flex-end'
          spacing={6}
        >
          <Flex item>
            <Button
              variant='tertiary'
              color='danger'
              disabled={isDeleting(editId)}
              onClick={() => deleteRow({ index: row.index, uuid: row.uuid })}
              data-testid='delete-button'
            >
              <Lang id='general.delete' />
              <TrashIcon fontSize='1rem' />
            </Button>
          </Flex>
        </Flex>
      )}
      <Flex
        container
        item
        direction='row'
        spacing={6}
      >
        <Flex
          container
          alignItems='flex-start'
          item
          spacing={6}
          style={{ flexBasis: 'auto' }}
          ref={(div) => (editingRowIndex !== undefined ? refSetter(editingRowIndex, 'editContainer', div) : undefined)}
        >
          {childIds.map((child) => {
            if (multiPageEnabled && multiPageIndex !== child.multiPageIndex) {
              return null;
            }

            if (tableColumns && tableColumns[child.baseId]?.showInExpandedEdit === false) {
              return null;
            }

            return (
              <GenericComponent
                key={child.baseId}
                baseComponentId={child.baseId}
              />
            );
          })}
        </Flex>
        <Flex
          item
          style={{ display: 'flex', width: '100%', marginBottom: 12 }}
        >
          {editForGroup?.multiPage && (
            <Flex
              container
              direction='row'
              spacing={2}
            >
              {hasPrevMultiPage && (
                <Flex item>
                  <Button
                    variant='secondary'
                    color='second'
                    onClick={() => prevMultiPage()}
                  >
                    <ChevronLeftIcon
                      fontSize='1rem'
                      aria-hidden='true'
                    />
                    <Lang id={texts.multipage_back_button ? texts.multipage_back_button : 'general.back'} />
                  </Button>
                </Flex>
              )}
              {hasNextMultiPage && (
                <Flex item>
                  <Button
                    variant='secondary'
                    color='second'
                    onClick={() => nextMultiPage()}
                  >
                    <Lang id={texts.multipage_next_button ? texts.multipage_next_button : 'general.next'} />
                    <ChevronRightIcon
                      fontSize='1rem'
                      aria-hidden='true'
                    />
                  </Button>
                </Flex>
              )}
            </Flex>
          )}
          <Flex
            container
            direction='row'
            spacing={2}
            justifyContent={multiPageEnabled ? 'flex-end' : 'flex-start'}
          >
            {saveAndNextButtonVisible && (
              <Flex item>
                <Button
                  id={`next-button-grp-${id}`}
                  onClick={() => openNextForEditing()}
                  variant='primary'
                  color='first'
                >
                  <Lang id={texts?.save_and_next_button ? texts?.save_and_next_button : 'general.save_and_next'} />
                </Button>
              </Flex>
            )}
            {saveButtonVisible && (
              <Flex item>
                <Button
                  id={`save-button-${id}`}
                  onClick={() => closeForEditing({ index: row.index, uuid: row.uuid })}
                  variant={saveAndNextButtonVisible ? 'secondary' : 'primary'}
                  color='first'
                >
                  <Lang id={texts?.save_button ? texts?.save_button : 'general.save_and_close'} />
                </Button>
              </Flex>
            )}
          </Flex>
        </Flex>
      </Flex>
    </div>
  );
}
