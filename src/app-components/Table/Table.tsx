import React from 'react';

import { Button, Table } from '@digdir/designsystemet-react';
import cn from 'classnames';
import { format, isValid, parseISO } from 'date-fns';
import { pick } from 'dot-object';
import type { JSONSchema7 } from 'json-schema';

import classes from 'src/app-components/Table/Table.module.css';
import type { FormDataObject, FormDataValue } from 'src/app-components/DynamicForm/DynamicForm';

interface Column {
  header: React.ReactNode;
  accessors: string[];
  renderCell?: (values: FormDataValue[], rowData: FormDataObject, rowIndex: number) => React.ReactNode;
  enableInlineEditing?: boolean;
}

export interface TableActionButton {
  onClick: (rowIdx: number, rowData: FormDataObject) => void;
  buttonText: React.ReactNode;
  icon: React.ReactNode;
  color?: 'first' | 'second' | 'success' | 'danger';
  variant?: 'tertiary' | 'primary' | 'secondary';
}

interface DataTableProps {
  data: FormDataObject[];
  schema: JSONSchema7;
  columns: Column[];
  caption?: React.ReactNode;
  actionButtons?: TableActionButton[];
  actionButtonHeader?: React.ReactNode;
  mobile?: boolean;
  size?: 'sm' | 'md' | 'lg';
  zebra?: boolean;
  stickyHeader?: boolean;
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

export function AppTable({
  caption,
  data,
  columns,
  actionButtons,
  mobile,
  actionButtonHeader,
  size,
  zebra,
  stickyHeader,
}: DataTableProps) {
  const defaultButtonVariant = mobile ? 'secondary' : 'tertiary';
  return (
    <Table
      size={size || 'sm'}
      className={cn(classes.table, { [classes.mobileTable]: mobile })}
      zebra={zebra}
      stickyHeader={stickyHeader}
    >
      {caption}
      <Table.Head>
        <Table.Row>
          {columns.map((col, index) => (
            <Table.HeaderCell
              style={stickyHeader ? { zIndex: 2 } : {}}
              key={index}
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
        {data.map((rowData, rowIndex) => (
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
                      size='sm'
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
        ))}
      </Table.Body>
    </Table>
  );
}
