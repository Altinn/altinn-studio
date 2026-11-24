import React from 'react';
import type { ReactNode } from 'react';

import { Button } from '@digdir/designsystemet-react';
import cn from 'classnames';
import { format, isValid, parseISO } from 'date-fns';

import { ConfirmPopover } from '..';
import { Spinner } from '../Spinner/Spinner';
import { BaseTable } from './BaseTable';
import classes from './Table.module.css';

export type TableCellValue =
  string | number | boolean | null | TableCellValue[] | { [key: string]: TableCellValue };

export interface Column<T> {
  header: React.ReactNode;
  ariaLabel?: string;
  accessors: string[];
  renderCell?: (values: TableCellValue[], rowData: T, rowIndex: number) => React.ReactNode;
  enableInlineEditing?: boolean;
}

export interface TableActionButtonConfirm {
  message: ReactNode;
  confirmText: ReactNode;
  cancelText: ReactNode;
}

export interface TableActionButton<T = unknown> {
  onClick: (rowIdx: number, rowData: T) => void;
  buttonText: React.ReactNode;
  icon: React.ReactNode;
  color?: 'first' | 'second' | 'success' | 'danger';
  variant?: 'tertiary' | 'primary' | 'secondary';
  confirm?: TableActionButtonConfirm;
}

export interface AppTableProps<T> {
  data: T[];
  columns: Column<T>[];
  caption?: React.ReactNode;
  ariaLabel?: string;
  tableTestId?: string;
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
  ariaLabel,
  tableTestId,
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
    <BaseTable
      data-size={size ?? 'sm'}
      stackedRows={mobile ? 'framed' : undefined}
      className={cn(classes.table, tableClassName, { [classes.mobileTable]: mobile })}
      zebra={zebra}
      stickyHeader={stickyHeader}
      aria-label={ariaLabel}
      data-testid={tableTestId}
    >
      {caption}
      <BaseTable.Head>
        <BaseTable.Row>
          {columns.map((col, index) => (
            <BaseTable.HeaderCell
              className={headerClassName}
              key={index}
              aria-label={col.ariaLabel}
            >
              {col.header}
            </BaseTable.HeaderCell>
          ))}
          {actionButtons && actionButtons.length > 0 && (
            <BaseTable.HeaderCell>
              <span className={classes.visuallyHidden}>{actionButtonHeader}</span>
            </BaseTable.HeaderCell>
          )}
        </BaseTable.Row>
      </BaseTable.Head>
      <BaseTable.Body>
        {isLoading ? (
          <BaseTable.Row>
            <BaseTable.Cell
              colSpan={columns.length + (actionButtons ? 1 : 0)}
              style={{ textAlign: 'center' }}
            >
              <Spinner aria-label={loadingLabel} data-size='md' />
            </BaseTable.Cell>
          </BaseTable.Row>
        ) : data.length === 0 ? (
          <BaseTable.Row>
            <BaseTable.Cell
              colSpan={columns.length + (actionButtons ? 1 : 0)}
              className={classes.emptyCell}
            >
              <em>{emptyText}</em>
            </BaseTable.Cell>
          </BaseTable.Row>
        ) : (
          data.map((rowData, rowIndex) => (
            <BaseTable.Row key={rowIndex}>
              {columns.map((col, colIndex) => {
                const cellValues = col.accessors
                  .map((accessor) => pickByPath(accessor, rowData))
                  .filter((value) => value != null);

                if (col.renderCell) {
                  return (
                    <BaseTable.Cell key={colIndex} data-header-title={col.header ?? ''}>
                      {col.renderCell(cellValues, rowData, rowIndex)}
                    </BaseTable.Cell>
                  );
                }

                if (cellValues.length === 0) {
                  return (
                    <BaseTable.Cell key={colIndex} data-header-title={col.header ?? ''}>
                      -
                    </BaseTable.Cell>
                  );
                }

                if (cellValues.length === 1) {
                  return (
                    <BaseTable.Cell key={colIndex} data-header-title={col.header ?? ''}>
                      {formatValue(cellValues[0])}
                    </BaseTable.Cell>
                  );
                }

                return (
                  <BaseTable.Cell key={colIndex} data-header-title={col.header ?? ''}>
                    <ul>
                      {cellValues.map((value, idx) => (
                        <li key={idx}>{formatValue(value)}</li>
                      ))}
                    </ul>
                  </BaseTable.Cell>
                );
              })}
              {actionButtons && actionButtons.length > 0 && (
                <BaseTable.Cell>
                  <div className={classes.buttonContainer}>
                    {actionButtons.map((button, idx) => {
                      const { confirm } = button;
                      const handleAction = () => button.onClick(rowIndex, rowData);
                      const buttonElement = (
                        <Button
                          key={idx}
                          onClick={confirm ? undefined : handleAction}
                          data-size='sm'
                          variant={button.variant ?? defaultButtonVariant}
                          color={button.color ?? 'second'}
                        >
                          {button.buttonText}
                          {button.icon}
                        </Button>
                      );

                      if (!confirm) {
                        return buttonElement;
                      }

                      return (
                        <ConfirmPopover
                          key={idx}
                          message={confirm.message}
                          confirmText={confirm.confirmText}
                          cancelText={confirm.cancelText}
                          onConfirm={handleAction}
                        >
                          {buttonElement}
                        </ConfirmPopover>
                      );
                    })}
                  </div>
                </BaseTable.Cell>
              )}
            </BaseTable.Row>
          ))
        )}
      </BaseTable.Body>
    </BaseTable>
  );
}
