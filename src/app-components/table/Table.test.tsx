// AppTable.test.tsx
import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';

import { AppTable } from 'src/app-components/table/Table';

// Sample data
const data = [
  { id: 1, name: 'Alice', date: '2023-10-05', amount: 100 },
  { id: 2, name: 'Bob', date: '2023-10-06', amount: 200 },
];

// Columns configuration
const columns = [
  { header: 'Name', accessors: ['name'] },
  { header: 'Date', accessors: ['date'] },
  { header: 'Amount', accessors: ['amount'] },
];

// Action buttons configuration
const actionButtons = [
  {
    onClick: jest.fn(),
    buttonText: 'Edit',
    icon: null,
  },
  {
    onClick: jest.fn(),
    buttonText: 'Delete',
    icon: null,
  },
];

describe('AppTable Component', () => {
  test('renders table with correct headers', () => {
    render(
      <AppTable
        data={data}
        columns={columns}
      />,
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
  });

  test('renders correct number of rows', () => {
    render(
      <AppTable
        data={data}
        columns={columns}
      />,
    );
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(data.length + 1); // +1 for header row
  });

  test('renders action buttons when provided', () => {
    render(
      <AppTable
        data={data}
        columns={columns}
        actionButtons={actionButtons}
      />,
    );
    expect(screen.getAllByText('Edit').length).toBe(data.length);
    expect(screen.getAllByText('Delete').length).toBe(data.length);
  });

  test('correctly formats dates in cells', () => {
    render(
      <AppTable
        data={data}
        columns={columns}
      />,
    );
    expect(screen.getByText('05.10.2023')).toBeInTheDocument();
    expect(screen.getByText('06.10.2023')).toBeInTheDocument();
  });

  test('uses renderCell function when provided', () => {
    const columnsWithRenderCell = [
      ...columns,
      {
        header: 'Custom',
        accessors: ['name', 'amount'],
        renderCell: (values) => `Name: ${values[0]}, Amount: ${values[1]}`,
      },
    ];
    render(
      <AppTable
        data={data}
        columns={columnsWithRenderCell}
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
        buttonText: 'Edit',
        icon: null,
      },
    ];

    render(
      <AppTable
        data={data}
        columns={columns}
        actionButtons={actionButtonsMock}
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
    render(
      <AppTable
        data={data}
        columns={columns}
      />,
    );
    const headerCells = screen.getAllByRole('columnheader');
    expect(headerCells.length).toBe(columns.length);
  });

  test('renders extra header cell when actionButtons are provided', () => {
    render(
      <AppTable
        data={data}
        columns={columns}
        actionButtons={actionButtons}
      />,
    );
    const headerCells = screen.getAllByRole('columnheader');
    expect(headerCells.length).toBe(columns.length + 1);
  });

  test('non-date values are not changed by formatIfDate', () => {
    const dataWithNonDate = [
      { id: 1, name: 'Alice', date: 'Not a date', amount: 100 },
      { id: 2, name: 'Bob', date: 'Also not a date', amount: 200 },
    ];
    render(
      <AppTable
        data={dataWithNonDate}
        columns={columns}
      />,
    );
    expect(screen.getByText('Not a date')).toBeInTheDocument();
    expect(screen.getByText('Also not a date')).toBeInTheDocument();
  });
});
