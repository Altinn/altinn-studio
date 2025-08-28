import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioCheckboxTable, type StudioCheckboxTableProps } from './StudioCheckboxTable';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

describe('StudioPageHeader', () => {
  it('should render the children passed to it', () => {
    renderStudioCheckboxTable();

    expect(screen.getByText(childrenTextMock)).toBeInTheDocument();
  });

  it('appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderStudioCheckboxTable({ className }));
  });
});

const childrenTextMock: string = 'text';
const defaultProps: StudioCheckboxTableProps = {
  children: (
    <tbody>
      <tr>
        <td>{childrenTextMock}</td>
      </tr>
    </tbody>
  ),
};

const renderStudioCheckboxTable = (props: Partial<StudioCheckboxTableProps> = {}) => {
  return render(<StudioCheckboxTable {...defaultProps} {...props} />);
};
