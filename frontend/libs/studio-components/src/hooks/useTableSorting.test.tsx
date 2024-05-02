import { useTableSorting } from './useTableSorting';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Rows } from '../components';

type TestComponentProps = {
  rows: Rows;
};

type Row = Record<string, React.ReactNode> & Record<'id', string | number>;

const TestComponent = ({ rows }: TestComponentProps) => {
  const { sortedRows, handleSorting } = useTableSorting(rows);
  return (
    <div>
      <button onClick={() => handleSorting('name')}>Sort by Name</button>
      <button onClick={() => handleSorting('creator')}>Sort by Creator</button>
      <ul>
        {sortedRows.map((row: Row) => (
          <li key={row.id}>
            {row.name} - {row.creator}
          </li>
        ))}
      </ul>
    </div>
  );
};

describe('useTableSorting', () => {
  const rows: Rows = [
    {
      id: 1,
      name: 'A form',
      creator: 'Digdir',
    },
    {
      id: 2,
      name: 'B form',
      creator: 'Brreg',
    },
    {
      id: 3,
      name: 'C form',
      creator: 'Skatt',
    },
  ];

  it('should render the initial state', () => {
    render(<TestComponent rows={rows} />);
    expect(screen.getByText('A form - Digdir')).toBeInTheDocument();
    expect(screen.getByText('B form - Brreg')).toBeInTheDocument();
    expect(screen.getByText('C form - Skatt')).toBeInTheDocument();
  });

  it('should sort rows in ascending order when a column is clicked', async () => {
    const user = userEvent.setup();
    render(<TestComponent rows={rows} />);
    await user.click(screen.getByText('Sort by Name'));
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('A form - Digdir');
    expect(screen.getAllByRole('listitem')[1]).toHaveTextContent('B form - Brreg');
    expect(screen.getAllByRole('listitem')[2]).toHaveTextContent('C form - Skatt');
  });

  it('should sort rows in descending order when the same column is clicked again', async () => {
    const user = userEvent.setup();
    render(<TestComponent rows={rows} />);
    await user.click(screen.getByText('Sort by Creator'));
    await user.click(screen.getByText('Sort by Creator'));
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('C form - Skatt');
    expect(screen.getAllByRole('listitem')[1]).toHaveTextContent('A form - Digdir');
    expect(screen.getAllByRole('listitem')[2]).toHaveTextContent('B form - Brreg');
  });

  it('should reset the sort direction to ascending when a different column is clicked', async () => {
    const user = userEvent.setup();
    render(<TestComponent rows={rows} />);
    await user.click(screen.getByText('Sort by Name'));
    await user.click(screen.getByText('Sort by Creator'));
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('B form - Brreg');
    expect(screen.getAllByRole('listitem')[1]).toHaveTextContent('A form - Digdir');
    expect(screen.getAllByRole('listitem')[2]).toHaveTextContent('C form - Skatt');
  });
});
