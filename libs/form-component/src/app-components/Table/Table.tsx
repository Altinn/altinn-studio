import React from 'react';

import { Button, Table } from '@digdir/designsystemet-react';
import cn from 'classnames';
import { format, isValid, parseISO } from 'date-fns';

import { Spinner } from '../Spinner/Spinner';
import classes from './Table.module.css';

export type TableCellValue =
  | string
  | number
  | boolean
  | null
  | TableCellValue[]
  | { [key: string]: TableCellValue };

export interface Column<T> {
  header: string | null;
  ariaLabel?: string;
  accessors: string[];
  renderCell?: (values: TableCellValue[], rowData: T, rowIndex: number) => React.ReactNode;
  enableInlineEditing?: boolean;
}

export interface TableActionButton<T = unknown> {
  onClick: (rowIdx: number, rowData: T) => void;
  buttonText: React.ReactNode;
  icon: React.ReactNode;
  color?: 'first' | 'second' | 'success' | 'danger';
  variant?: 'tertiary' | 'primary' | 'secondary';
}

export interface AppTableProps<T> {
  data: T[];
  columns: Column<T>[];
  caption?: React.ReactNode;
  actionButtons?: TableActionButton<T>[];
  actionButtonHeader?: string;
  mobile?: boolean;
  size?: 'sm' | 'md' | 'lg';
  zebra?: boolean;
  stickyHeader?: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
  emptyText?: string;
  tableClassName?: string;
  headerClassName?: string;
}

function pickByPath(path: string, source: unknown): TableCellValue {
  const segments = path.split('.');
  let current: unknown = source;
  for (const segment of segments) {
    if (current == null || typeof current !== 'object') {
      return null;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current as TableCellValue;
}

function formatValue(value: TableCellValue): string {
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
  loadingLabel = 'Loading data...',
  emptyText,
}: AppTableProps<T>) {
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
              <span className={classes.visuallyHidden}>{actionButtonHeader}</span>
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
              <Spinner aria-label={loadingLabel} data-size='md' />
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
                  .map((accessor) => pickByPath(accessor, rowData))
                  .filter((value) => value != null);

                if (col.renderCell) {
                  return (
                    <Table.Cell key={colIndex} data-header-title={col.header ?? ''}>
                      {col.renderCell(cellValues, rowData, rowIndex)}
                    </Table.Cell>
                  );
                }

                if (cellValues.length === 0) {
                  return (
                    <Table.Cell key={colIndex} data-header-title={col.header ?? ''}>
                      -
                    </Table.Cell>
                  );
                }

                if (cellValues.length === 1) {
                  return (
                    <Table.Cell key={colIndex} data-header-title={col.header ?? ''}>
                      {formatValue(cellValues[0])}
                    </Table.Cell>
                  );
                }

                return (
                  <Table.Cell key={colIndex} data-header-title={col.header ?? ''}>
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
