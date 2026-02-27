import React from 'react';

import { fireEvent, screen } from '@testing-library/react';
import type { JSONSchema7 } from 'json-schema';

import { AppTable } from 'src/app-components/Table/Table';
import { renderWithAppComponentsProvider } from 'src/app-components/test/renderWithAppComponentsProvider';
import type { TranslationKey } from 'src/app-components/types';

const data = [
  { id: 1, name: 'Alice', date: '05.10.2023', amount: 100 },
  { id: 2, name: 'Bob', date: '06.10.2023', amount: 200 },
];

const columns = [
  { header: 'Name' as TranslationKey, accessors: ['name'] },
  { header: 'Date' as TranslationKey, accessors: ['date'] },
  { header: 'Amount' as TranslationKey, accessors: ['amount'] },
];

const actionButtons = [
  {
    onClick: jest.fn(),
    buttonText: 'Edit' as TranslationKey,
    icon: null,
  },
  {
    onClick: jest.fn(),
    buttonText: 'Delete' as TranslationKey,
    icon: null,
  },
];

const schema: JSONSchema7 = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
    date: { type: 'string', format: 'date' },
    amount: { type: 'number' },
  },
  required: ['id', 'name', 'date', 'amount'],
};

describe('AppTable Component', () => {
  test('renders table with correct headers', () => {
    renderWithAppComponentsProvider(
      <AppTable
        data={data}
        columns={columns}
        schema={schema}
        emptyText={undefined}
      />,
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
  });

  test('renders correct number of rows', () => {
    renderWithAppComponentsProvider(
      <AppTable
        data={data}
        columns={columns}
        schema={schema}
        emptyText={undefined}
      />,
    );
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(data.length + 1); // +1 for header row
  });

  test('renders action buttons when provided', () => {
    renderWithAppComponentsProvider(
      <AppTable
        data={data}
        columns={columns}
        actionButtons={actionButtons}
        schema={schema}
        emptyText={undefined}
      />,
    );
    expect(screen.getAllByText('Edit').length).toBe(data.length);
    expect(screen.getAllByText('Delete').length).toBe(data.length);
  });

  test('correctly displays dates in cells', () => {
    renderWithAppComponentsProvider(
      <AppTable
        data={data}
        columns={columns}
        schema={schema}
        emptyText={undefined}
      />,
    );
    expect(screen.getByText('05.10.2023')).toBeInTheDocument();
    expect(screen.getByText('06.10.2023')).toBeInTheDocument();
  });

  test('uses renderCell function when provided', () => {
    const columnsWithRenderCell = [
      ...columns,
      {
        header: 'Custom' as TranslationKey,
        accessors: ['name', 'amount'],
        renderCell: (values) => `Name: ${values[0]}, Amount: ${values[1]}`,
      },
    ];
    renderWithAppComponentsProvider(
      <AppTable
        data={data}
        columns={columnsWithRenderCell}
        schema={schema}
        emptyText={undefined}
      />,
    );
    expect(screen.getByText('Name: Alice, Amount: 100')).toBeInTheDocument();
    expect(screen.getByText('Name: Bob, Amount: 200')).toBeInTheDocument();
  });

  test('calls action button onClick when clicked', () => {
    const onClickMock = jest.fn();
    const actionButtonsMock = [
      {
        onClick: onClickMock,
        buttonText: 'Edit' as TranslationKey,
        icon: null,
      },
    ];

    renderWithAppComponentsProvider(
      <AppTable
        data={data}
        columns={columns}
        actionButtons={actionButtonsMock}
        schema={schema}
        emptyText={undefined}
      />,
    );

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    expect(onClickMock).toHaveBeenCalledWith(0, data[0]);

    fireEvent.click(editButtons[1]);
    expect(onClickMock).toHaveBeenCalledWith(1, data[1]);

    expect(onClickMock).toHaveBeenCalledTimes(2);
  });

  test('does not render action buttons column when actionButtons is not provided', () => {
    renderWithAppComponentsProvider(
      <AppTable
        data={data}
        columns={columns}
        schema={schema}
        emptyText={undefined}
      />,
    );
    const headerCells = screen.getAllByRole('columnheader');
    expect(headerCells.length).toBe(columns.length);
  });

  test('renders extra header cell when actionButtons are provided', () => {
    renderWithAppComponentsProvider(
      <AppTable
        data={data}
        columns={columns}
        actionButtons={actionButtons}
        schema={schema}
        emptyText={undefined}
      />,
    );
    const headerCells = screen.getAllByRole('columnheader');
    expect(headerCells.length).toBe(columns.length + 1);
  });

  test('non-date values are not changed by formatValue', () => {
    const dataWithNonDate = [
      { id: 1, name: 'Alice', date: 'Not a date', amount: 100 },
      { id: 2, name: 'Bob', date: 'Also not a date', amount: 200 },
    ];
    renderWithAppComponentsProvider(
      <AppTable
        data={dataWithNonDate}
        columns={columns}
        schema={schema}
        emptyText={undefined}
      />,
    );
    expect(screen.getByText('Not a date')).toBeInTheDocument();
    expect(screen.getByText('Also not a date')).toBeInTheDocument();
  });
});
