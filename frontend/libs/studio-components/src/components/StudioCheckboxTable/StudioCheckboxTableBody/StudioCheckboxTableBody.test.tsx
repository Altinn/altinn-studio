import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  StudioCheckboxTableBody,
  type StudioCheckboxTableBodyProps,
} from './StudioCheckboxTableBody';
import { StudioCheckboxTableRow } from '../StudioCheckboxTableRow';
import { rowElementMocks } from '../mocks';
import { type StudioCheckboxTableRowElement } from '../types/StudioCheckboxTableRowElement';

describe('StudioCheckboxTableBody', () => {
  it('should render multiple children elements', () => {
    renderStudioCheckboxTableBody({
      children: rowElementMocks.map((rowElement: StudioCheckboxTableRowElement) => (
        <StudioCheckboxTableRow
          key={rowElement.value}
          rowElement={rowElement}
          onChange={jest.fn()}
        />
      )),
    });

    expect(screen.getAllByRole('checkbox')).toHaveLength(2);

    rowElementMocks.forEach((rowElement: StudioCheckboxTableRowElement) => {
      expect(screen.getByRole('checkbox', { name: rowElement.label }));
      expect(screen.getByText(rowElement.description));
    });
    expect(screen.getByRole('checkbox', { name: rowElementMocks[0].label })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: rowElementMocks[1].label })).toBeChecked();
  });
});

const renderStudioCheckboxTableBody = (props: StudioCheckboxTableBodyProps) => {
  return render(
    <table>
      <StudioCheckboxTableBody {...props} />
    </table>,
  );
};
