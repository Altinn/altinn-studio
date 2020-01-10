import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import AltinnFilterChip from '../../src/components/AltinnFilterChip';

describe('>>> AltinnFilterChip--- Snapshot', () => {
  let mockKey: any;
  let mockLabel: string;
  let mockOnclickFunction: any;
  let mockActive: boolean;
  let mockClassName: string;
  let mockDeleteIcon: any;
  let mockOnDeleteFunction: any;
  let mockSortIcon: boolean;
  beforeEach(() => {
    mockKey = 0;
    mockLabel = 'mock label';
    mockActive = false;
    mockClassName = 'mock-class-name';
    mockSortIcon = true;
    mockDeleteIcon = <i className='ai ai-delete' />;
    mockOnDeleteFunction = () => {
      return false;
    };
    mockOnclickFunction = () => {
      return false;
    };
  });

  it('+++ Should match snapshot with the least amount of params', () => {
    const rendered = renderer.create(
      <AltinnFilterChip
        key={mockKey}
        label={mockLabel}
        active={mockActive}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ Should match snapshot with sort icon visible', () => {
    const rendered = renderer.create(
      <AltinnFilterChip
        key={mockKey}
        label={mockLabel}
        active={mockActive}
        className={mockClassName}
        sortIcon={mockSortIcon}
        onclickFunction={mockOnclickFunction}
        onDeleteFunction={mockOnDeleteFunction}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ Should match snapshot with delete icon visible', () => {
    const rendered = renderer.create(
      <AltinnFilterChip
        key={mockKey}
        label={mockLabel}
        active={mockActive}
        onclickFunction={mockOnclickFunction}
        onDeleteFunction={mockOnDeleteFunction}
        deleteIcon={mockDeleteIcon}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });
});
