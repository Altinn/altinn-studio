import { render, screen } from '@testing-library/react';
import React from 'react';
import { StudioTableRemotePagination } from './StudioTableRemotePagination';
import { columns, rows } from './mockData';
// import userEvent from "@testing-library/user-event/";

describe('StudioTableWithPagination', () => {
  it('should render the table with sorting and pagination', () => {
    render(<StudioTableRemotePagination columns={columns} rows={rows} />);

    expect(screen.getByRole('button', { name: 'Name' }));
    expect(screen.getByRole('cell', { name: 'Lila Patel' }));
    expect(screen.getByRole('combobox'));
    expect(screen.getByRole('button', { name: 'Side 1' }));
    expect(screen.getByRole('button', { name: 'Side 2' }));
  });

  it('should render the table without sorting and pagination', () => {
    render(<StudioTableRemotePagination columns={columns} rows={rows} />);

    expect(screen.getByRole('columnheader', { name: 'Name' }));
    expect(screen.getByRole('cell', { name: 'Lila Patel' }));
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Side 1' })).not.toBeInTheDocument();
  });

  // it("should sort the columns", async () => {
  //   const user = userEvent.setup();
  //   render(<StudioTableWithPagination columns={columns} rows={rows} />);
  //
  //   await user.click(screen.getByRole("button", {name: "Name"}));
  //   const cellsAfterFirstClick = screen.getAllByRole("cell");
  //   expect(cellsAfterFirstClick[2]).toHaveTextContent("Amelia Schmidt");
  //
  //   await act(async () => {
  //   await user.click(screen.getByRole("button", {name: "Name"}));
  //   })
  //   const cellsAfterSecondClick = screen.getAllByRole("cell");
  //   expect(cellsAfterSecondClick[2]).toHaveTextContent("William Torres");
  // })
});
