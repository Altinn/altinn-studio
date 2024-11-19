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
    const childText1 = 'Test Child1';
    const childText2 = 'Test Child2';

    renderStudioCheckboxTableBody({
      children: rowElementMocks.map((rowElement: StudioCheckboxTableRowElement) => (
        <StudioCheckboxTableRow
          key={rowElement.value}
          rowElement={rowElement}
          onChange={jest.fn()}
        />
      )),
    });

    expect(screen.getByText(childText1)).toBeInTheDocument();
    expect(screen.getByText(childText2)).toBeInTheDocument();
  });
});

const renderStudioCheckboxTableBody = (props: StudioCheckboxTableBodyProps) => {
  return render(
    <table>
      <StudioCheckboxTableBody {...props} />
    </table>,
  );
};
