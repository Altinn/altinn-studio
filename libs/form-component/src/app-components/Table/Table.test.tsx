import { fireEvent, render, screen } from '@testing-library/react';

import { AppTable } from './Table';

if (typeof document.getAnimations !== 'function') {
  document.getAnimations = () => [];
}

const data = [
  { id: 1, name: 'Alice', date: '05.10.2023', amount: 100 },
  { id: 2, name: 'Bob', date: '06.10.2023', amount: 200 },
];

const columns = [
  { header: 'Name', accessors: ['name'] },
  { header: 'Date', accessors: ['date'] },
  { header: 'Amount', accessors: ['amount'] },
];

const actionButtons = [
  { onClick: vi.fn(), buttonText: 'Edit', icon: null },
  { onClick: vi.fn(), buttonText: 'Delete', icon: null },
];

describe('AppTable', () => {
  it('renders table with correct headers', () => {
    render(<AppTable data={data} columns={columns} emptyText='' />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
  });

  it('renders the correct number of rows', () => {
    render(<AppTable data={data} columns={columns} emptyText='' />);
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(data.length + 1);
  });

  it('renders action buttons when provided', () => {
    render(<AppTable data={data} columns={columns} actionButtons={actionButtons} emptyText='' />);
    expect(screen.getAllByText('Edit').length).toBe(data.length);
    expect(screen.getAllByText('Delete').length).toBe(data.length);
  });

  it('formats ISO date values as dd.MM.yyyy', () => {
    const isoData = [{ id: 1, name: 'Alice', date: '2023-10-05', amount: 100 }];
    render(<AppTable data={isoData} columns={columns} emptyText='' />);
    expect(screen.getByText('05.10.2023')).toBeInTheDocument();
  });

  it('uses renderCell when provided', () => {
    const columnsWithRenderCell = [
      ...columns,
      {
        header: 'Custom',
        accessors: ['name', 'amount'],
        renderCell: (values: unknown[]) => `Name: ${values[0]}, Amount: ${values[1]}`,
      },
    ];
    render(<AppTable data={data} columns={columnsWithRenderCell} emptyText='' />);
    expect(screen.getByText('Name: Alice, Amount: 100')).toBeInTheDocument();
    expect(screen.getByText('Name: Bob, Amount: 200')).toBeInTheDocument();
  });

  it('calls action button onClick with the row index and data', () => {
    const onClick = vi.fn();
    render(
      <AppTable
        data={data}
        columns={columns}
        actionButtons={[{ onClick, buttonText: 'Edit', icon: null }]}
        emptyText=''
      />,
    );

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    expect(onClick).toHaveBeenCalledWith(0, data[0]);

    fireEvent.click(editButtons[1]);
    expect(onClick).toHaveBeenCalledWith(1, data[1]);
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('does not render an action column when actionButtons is absent', () => {
    render(<AppTable data={data} columns={columns} emptyText='' />);
    expect(screen.getAllByRole('columnheader').length).toBe(columns.length);
  });

  it('renders an extra header cell when actionButtons are provided', () => {
    render(<AppTable data={data} columns={columns} actionButtons={actionButtons} emptyText='' />);
    expect(screen.getAllByRole('columnheader').length).toBe(columns.length + 1);
  });

  it('leaves non-date strings unchanged', () => {
    const dataWithNonDate = [
      { id: 1, name: 'Alice', date: 'Not a date', amount: 100 },
      { id: 2, name: 'Bob', date: 'Also not a date', amount: 200 },
    ];
    render(<AppTable data={dataWithNonDate} columns={columns} emptyText='' />);
    expect(screen.getByText('Not a date')).toBeInTheDocument();
    expect(screen.getByText('Also not a date')).toBeInTheDocument();
  });

  it('renders the empty state when data is empty', () => {
    render(<AppTable data={[]} columns={columns} emptyText='No rows here' />);
    expect(screen.getByText('No rows here')).toBeInTheDocument();
  });

  it('renders the loading spinner when isLoading is true', () => {
    render(
      <AppTable
        data={[]}
        columns={columns}
        emptyText=''
        isLoading
        loadingLabel='Loading rows'
      />,
    );
    expect(screen.getByLabelText('Loading rows')).toBeInTheDocument();
  });
});
