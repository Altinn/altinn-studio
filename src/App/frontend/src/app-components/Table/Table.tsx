import React from 'react';
import type { ReactElement } from 'react';

import { Button, Spinner, Table } from '@digdir/designsystemet-react';
import cn from 'classnames';
import { format, isValid, parseISO } from 'date-fns';
import { pick } from 'dot-object';
import type { JSONSchema7 } from 'json-schema';

import classes from 'src/app-components/Table/Table.module.css';
import utilClasses from 'src/styles/utils.module.css';
import type { FormDataValue } from 'src/app-components/DynamicForm/DynamicForm';

interface Column<T> {
  header: React.ReactNode;
  ariaLabel?: string;
  accessors: string[];
  renderCell?: (values: FormDataValue[], rowData: T, rowIndex: number) => React.ReactNode;
  enableInlineEditing?: boolean;
}

export interface TableActionButton<T = unknown> {
  onClick: (rowIdx: number, rowData: T) => void;
  buttonText: React.ReactNode;
  icon: React.ReactNode;
  color?: 'first' | 'second' | 'success' | 'danger';
  variant?: 'tertiary' | 'primary' | 'secondary';
}

interface DataTableProps<T> {
  data: T[];
  schema?: JSONSchema7;
  columns: Column<T>[];
  caption?: React.ReactNode;
  actionButtons?: TableActionButton<T>[];
  actionButtonHeader?: React.ReactNode;
  mobile?: boolean;
  size?: 'sm' | 'md' | 'lg';
  zebra?: boolean;
  stickyHeader?: boolean;
  isLoading?: boolean;
  emptyText: ReactElement | undefined;
  tableClassName?: string;
  headerClassName?: string;
}

function formatValue(value: FormDataValue): string {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'string') {
    const parsedDate = parseISO(value);
    if (isValid(parsedDate)) {
      return format(parsedDate, 'dd.MM.yyyy');
    }
    return value;
  }
  if (value === null) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.map(formatValue).join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

export function AppTable<T>({
  caption,
  data,
  columns,
  actionButtons,
  mobile,
  actionButtonHeader,
  size,
  zebra,
  stickyHeader,
  tableClassName,
  headerClassName,
  isLoading = false,
  emptyText,
}: DataTableProps<T>) {
  const defaultButtonVariant = mobile ? 'secondary' : 'tertiary';
  return (
    <Table
      data-size={size ?? 'sm'}
      className={cn(classes.table, tableClassName, { [classes.mobileTable]: mobile })}
      zebra={zebra}
      stickyHeader={stickyHeader}
    >
      {caption}
      <Table.Head>
        <Table.Row>
          {columns.map((col, index) => (
            <Table.HeaderCell
              style={stickyHeader ? { zIndex: 2 } : {}}
              className={headerClassName}
              key={index}
              aria-label={col.ariaLabel}
            >
              {col.header}
            </Table.HeaderCell>
          ))}
          {actionButtons && actionButtons.length > 0 && (
            <Table.HeaderCell>
              <span className={utilClasses.visuallyHidden}>{actionButtonHeader}</span>
            </Table.HeaderCell>
          )}
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {isLoading ? (
          <Table.Row>
            <Table.Cell
              colSpan={columns.length + (actionButtons ? 1 : 0)}
              style={{ textAlign: 'center' }}
            >
              <Spinner
                aria-label='Loading data...'
                data-size='md'
              />
            </Table.Cell>
          </Table.Row>
        ) : data.length === 0 ? (
          <Table.Row>
            <Table.Cell
              colSpan={columns.length + (actionButtons ? 1 : 0)}
              className={classes.emptyCell}
            >
              <em>{emptyText}</em>
            </Table.Cell>
          </Table.Row>
        ) : (
          data.map((rowData, rowIndex) => (
            <Table.Row key={rowIndex}>
              {columns.map((col, colIndex) => {
                const cellValues = col.accessors
                  .map((accessor) => pick(accessor, rowData) as FormDataValue)
                  .filter((value) => value != null);

                if (col.renderCell) {
                  return (
                    <Table.Cell
                      key={colIndex}
                      data-header-title={col.header}
                    >
                      {col.renderCell(cellValues, rowData, rowIndex)}
                    </Table.Cell>
                  );
                }

                if (cellValues.length === 0) {
                  return (
                    <Table.Cell
                      key={colIndex}
                      data-header-title={col.header}
                    >
                      -
                    </Table.Cell>
                  );
                }

                if (cellValues.length === 1) {
                  return (
                    <Table.Cell
                      key={colIndex}
                      data-header-title={col.header}
                    >
                      {formatValue(cellValues[0])}
                    </Table.Cell>
                  );
                }

                return (
                  <Table.Cell
                    key={colIndex}
                    data-header-title={col.header}
                  >
                    <ul>
                      {cellValues.map((value, idx) => (
                        <li key={idx}>{formatValue(value)}</li>
                      ))}
                    </ul>
                  </Table.Cell>
                );
              })}
              {actionButtons && actionButtons.length > 0 && (
                <Table.Cell>
                  <div className={classes.buttonContainer}>
                    {actionButtons.map((button, idx) => (
                      <Button
                        key={idx}
                        onClick={() => button.onClick(rowIndex, rowData)}
                        data-size='sm'
                        variant={button.variant ? button.variant : defaultButtonVariant}
                        color={button.color ? button.color : 'second'}
                      >
                        {button.buttonText}
                        {button.icon}
                      </Button>
                    ))}
                  </div>
                </Table.Cell>
              )}
            </Table.Row>
          ))
        )}
      </Table.Body>
    </Table>
  );
}
