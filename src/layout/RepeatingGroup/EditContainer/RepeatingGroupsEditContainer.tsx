import React from 'react';
import type { JSX } from 'react';

import { ChevronLeftIcon, ChevronRightIcon, TrashIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { Button } from 'src/app-components/Button/Button';
import { Flex } from 'src/app-components/Flex/Flex';
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
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { LayoutNode } from 'src/utils/layout/LayoutNode';
import { useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { CompInternal } from 'src/layout/layout';
import type { RepGroupRow } from 'src/layout/RepeatingGroup/utils';

export interface IRepeatingGroupsEditContainer {
  editId: string;
  className?: string;
  forceHideSaveButton?: boolean;
}

export function RepeatingGroupsEditContainer({ editId, ...props }: IRepeatingGroupsEditContainer): JSX.Element | null {
  const { node } = useRepeatingGroup();
  const group = useNodeItem(node);
  const rows = RepGroupHooks.useVisibleRows(node);
  const row = rows.find((r) => r && r.uuid === editId);
  if (!row) {
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
  row: RepGroupRow;
}): JSX.Element | null {
  const { node, closeForEditing, deleteRow, openNextForEditing, isDeleting } = useRepeatingGroup();
  const { visibleRows } = useRepeatingGroupRowState();
  const childIds = RepGroupHooks.useChildIds(node);

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
  const rowWithExpressions = RepGroupHooks.useRowWithExpressions(node, { uuid: row.uuid });
  const textsForRow = rowWithExpressions?.textResourceBindings;
  const editForRow = rowWithExpressions?.edit;
  const editForGroup = group.edit;
  const { refSetter } = useRepeatingGroupsFocusContext();
  const texts = {
    ...group.textResourceBindings,
    ...textsForRow,
  };

  const isNested = node.parent instanceof LayoutNode;
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
          ref={(n) => refSetter && editingRowIndex !== undefined && refSetter(editingRowIndex, 'editContainer', n)}
        >
          {childIds.map((nodeId) => (
            <ChildComponent
              key={nodeId}
              nodeId={nodeId}
              multiPageIndex={multiPageIndex}
              multiPageEnabled={multiPageEnabled}
              tableColumns={group.tableColumns}
            />
          ))}
        </Flex>
        <Flex item>
          {editForGroup?.multiPage && (
            <Flex
              container
              direction='row'
              spacing={2}
              style={{ marginBottom: 12 }}
            >
              {hasPrevMultiPage && (
                <Flex item>
                  <Button
                    variant='tertiary'
                    color='second'
                    onClick={() => prevMultiPage()}
                  >
                    <ChevronLeftIcon
                      fontSize='1rem'
                      aria-hidden='true'
                    />
                    <Lang id='general.back' />
                  </Button>
                </Flex>
              )}
              {hasNextMultiPage && (
                <Flex item>
                  <Button
                    variant='tertiary'
                    color='second'
                    onClick={() => nextMultiPage()}
                  >
                    <Lang id='general.next' />
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
