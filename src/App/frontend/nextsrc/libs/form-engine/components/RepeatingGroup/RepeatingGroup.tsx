import React, { useState, useCallback } from 'react';

import { Button, Table } from '@digdir/designsystemet-react';

import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { useGroupArray, usePushArrayItem, useRemoveArrayItem, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import { FormEngine } from 'nextsrc/libs/form-engine/FormEngine';
import { Pagination } from 'nextsrc/core/components/Pagination/Pagination';
import { useRowCellValue } from 'nextsrc/libs/form-engine/components/RepeatingGroup/useRowDisplay';
import classes from 'nextsrc/libs/form-engine/components/RepeatingGroup/RepeatingGroup.module.css';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';
import type { CompRepeatingGroupExternal } from 'src/layout/RepeatingGroup/config.generated';

export const RepeatingGroup = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as unknown as CompRepeatingGroupExternal;
  const groupField = extractField(props.dataModelBindings.group);
  const rows = useGroupArray(groupField, parentBinding, itemIndex);
  const pushItem = usePushArrayItem(groupField, parentBinding, itemIndex);
  const removeItem = useRemoveArrayItem(groupField, parentBinding, itemIndex);
  const client = useFormClient();
  const { langAsString } = useLanguage();

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const children = component.children ?? [];

  // Resolve the full path for this group so nested children get the right parentBinding
  const resolvedGroupPath =
    parentBinding !== undefined && itemIndex !== undefined
      ? `${parentBinding}[${itemIndex}].${groupField.split('.').pop()}`
      : groupField;

  // Text resources
  const addButtonText = useTextResource(
    typeof props.textResourceBindings?.add_button === 'string'
      ? props.textResourceBindings.add_button
      : undefined,
  ) || langAsString('general.add_new');
  const editButtonOpenText = useTextResource(
    typeof props.textResourceBindings?.edit_button_open === 'string'
      ? props.textResourceBindings.edit_button_open
      : undefined,
  ) || langAsString('general.edit');
  const editButtonCloseText = useTextResource(
    typeof props.textResourceBindings?.edit_button_close === 'string'
      ? props.textResourceBindings.edit_button_close
      : undefined,
  ) || langAsString('general.save_and_close');
  const saveButtonText = useTextResource(
    typeof props.textResourceBindings?.save_button === 'string'
      ? props.textResourceBindings.save_button
      : undefined,
  ) || langAsString('general.save_and_close');

  // Pagination config
  const rowsPerPage = props.pagination?.rowsPerPage;
  const showPagination = rowsPerPage !== undefined && rows.length > rowsPerPage;
  const pageSize = rowsPerPage ?? rows.length;

  // Calculate visible rows for current page
  const startIndex = (currentPage - 1) * pageSize;
  const visibleRows = showPagination ? rows.slice(startIndex, startIndex + pageSize) : rows;

  const handleAdd = useCallback(() => {
    pushItem({});
    // Auto-open the new row for editing
    const newIndex = rows.length;
    if (showPagination) {
      // Navigate to the page that contains the new row
      const newPage = Math.ceil((newIndex + 1) / pageSize);
      setCurrentPage(newPage);
    }
    setEditingIndex(newIndex);
  }, [pushItem, rows.length, showPagination, pageSize]);

  const handleDelete = useCallback(
    (absoluteIndex: number) => {
      // Clear validations for the deleted row
      const prefix = `${resolvedGroupPath}[${absoluteIndex}]`;
      client.validationStore.getState().clearByPathPrefix(prefix);

      removeItem(absoluteIndex);

      // Adjust editing index
      if (editingIndex === absoluteIndex) {
        setEditingIndex(null);
      } else if (editingIndex !== null && editingIndex > absoluteIndex) {
        setEditingIndex(editingIndex - 1);
      }
    },
    [removeItem, editingIndex, resolvedGroupPath, client],
  );

  const handleEdit = useCallback(
    (absoluteIndex: number) => {
      setEditingIndex((prev) => (prev === absoluteIndex ? null : absoluteIndex));
    },
    [],
  );

  const handleSave = useCallback(() => {
    setEditingIndex(null);
  }, []);

  const handleSetCurrentPage = useCallback(
    (page: number) => {
      // Close edit when changing page
      setEditingIndex(null);
      setCurrentPage(page);
    },
    [],
  );

  // Number of columns: children + actions column
  const totalColumns = children.length + 1;

  return (
    <div>
      <Table data-size='sm'>
        <Table.Head>
          <Table.Row>
            {children.map((child) => (
              <ColumnHeader
                key={child.id}
                child={child}
              />
            ))}
            <Table.HeaderCell className={classes.actionCell}>
              <span />
            </Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {visibleRows.map((_, visibleIdx) => {
            const absoluteIndex = showPagination ? startIndex + visibleIdx : visibleIdx;
            const isEditing = editingIndex === absoluteIndex;
            return (
              <React.Fragment key={absoluteIndex}>
                <Table.Row>
                  {children.map((child) => (
                    <RowCell
                      key={child.id}
                      child={child}
                      parentBinding={resolvedGroupPath}
                      rowIndex={absoluteIndex}
                    />
                  ))}
                  <Table.Cell className={classes.actionCell}>
                    <div className={classes.actionButtons}>
                      <Button
                        type='button'
                        variant='tertiary'
                        data-size='sm'
                        onClick={() => (isEditing ? handleSave() : handleEdit(absoluteIndex))}
                      >
                        {isEditing ? saveButtonText : editButtonOpenText}
                      </Button>
                      <Button
                        type='button'
                        variant='tertiary'
                        color='danger'
                        data-size='sm'
                        onClick={() => handleDelete(absoluteIndex)}
                      >
                        {langAsString('general.delete')}
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
                {isEditing && (
                  <Table.Row>
                    <Table.Cell colSpan={totalColumns}>
                      <div className={classes.editContainer}>
                        <FormEngine
                          components={children}
                          parentBinding={resolvedGroupPath}
                          itemIndex={absoluteIndex}
                        />
                        <Button
                          type='button'
                          data-size='sm'
                          onClick={handleSave}
                        >
                          {saveButtonText}
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                )}
              </React.Fragment>
            );
          })}
        </Table.Body>
      </Table>
      {showPagination && (
        <div className={classes.paginationContainer}>
          <Pagination
            id={`repeating-group-${component.id}`}
            nextLabel={langAsString('general.next') || 'Next'}
            nextLabelAriaLabel={langAsString('general.next') || 'Next'}
            previousLabel={langAsString('general.back') || 'Back'}
            previousLabelAriaLabel={langAsString('general.back') || 'Back'}
            size='sm'
            currentPage={currentPage}
            setCurrentPage={handleSetCurrentPage}
            numberOfRows={rows.length}
            pageSize={pageSize}
            rowsPerPageText=''
            onPageSizeChange={() => {}}
          />
        </div>
      )}
      <div className={classes.addButton}>
        <Button
          type='button'
          variant='secondary'
          data-size='sm'
          onClick={handleAdd}
        >
          {addButtonText}
        </Button>
      </div>
    </div>
  );
};

/**
 * Renders a column header from a child component's textResourceBindings.title.
 * Extracted as a component so useTextResource can be called per child.
 */
function ColumnHeader({ child }: { child: ResolvedCompExternal }) {
  const trb = child.textResourceBindings as Record<string, unknown> | undefined;
  const titleKey = typeof trb?.title === 'string' ? trb.title : undefined;
  const title = useTextResource(titleKey);
  return <Table.HeaderCell>{title}</Table.HeaderCell>;
}

/**
 * Renders a single cell value in the summary table row.
 * Uses useRowCellValue hook which requires being a component (hooks in loops).
 */
function RowCell({
  child,
  parentBinding,
  rowIndex,
}: {
  child: ResolvedCompExternal;
  parentBinding: string;
  rowIndex: number;
}) {
  const displayValue = useRowCellValue(child, parentBinding, rowIndex);
  return <Table.Cell>{displayValue}</Table.Cell>;
}
