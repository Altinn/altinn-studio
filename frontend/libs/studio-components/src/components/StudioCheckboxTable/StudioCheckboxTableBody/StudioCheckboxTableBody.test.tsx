import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  StudioCheckboxTableBody,
  type StudioCheckboxTableBodyProps,
} from './StudioCheckboxTableBody';

describe('StudioCheckboxTableBody', () => {
  it('should render the children passed as prop', () => {
    const childText = 'Test Child';
    renderStudioCheckboxTableBody({
      children: (
        <tr>
          <td>{childText}</td>
        </tr>
      ),
    });

    expect(screen.getByText(childText)).toBeInTheDocument();
  });

  it('should render multiple children elements', () => {
    const childText1 = 'Test Child1';
    const childText2 = 'Test Child2';

    renderStudioCheckboxTableBody({
      children: (
        <tr>
          <td>{childText1}</td>
          <td>{childText2}</td>
        </tr>
      ),
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
