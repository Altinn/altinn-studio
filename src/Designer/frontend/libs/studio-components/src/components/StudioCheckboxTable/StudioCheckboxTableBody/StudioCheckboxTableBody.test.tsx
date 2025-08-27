import React from 'react';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { StudioCheckboxTableBody } from './StudioCheckboxTableBody';

type MockRowProps = {
  label: string;
};
const MockRow = ({ label }: MockRowProps): ReactElement => (
  <tr>
    <td>{label}</td>
  </tr>
);

describe('StudioCheckboxTableBody', () => {
  it('should render children inside StudioTable.Body', () => {
    render(
      <table>
        <StudioCheckboxTableBody>
          {[1, 2].map((i: number) => (
            <MockRow key={i} label={`Row ${i}`} />
          ))}
        </StudioCheckboxTableBody>
      </table>,
    );

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(2);

    [1, 2].forEach((i: number) => {
      expect(rows[i - 1]).toHaveTextContent(`Row ${i}`);
    });
  });
});
