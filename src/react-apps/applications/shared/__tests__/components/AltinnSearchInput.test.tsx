import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import AltinnSearchInput from '../../src/components/AltinnSearchInput';

describe('>>> AltinnSearchInput--- Snapshot', () => {
  let mockId: string;
  let mockPlaceholder: any;
  let mockOnChangeFunction: any;
  beforeEach(() => {
    mockId = 'mock id';
    mockPlaceholder = 'mock placeholder';
    mockOnChangeFunction = () => {
      return false;
    };
  });

  it('+++ Should match snapshot with the least amount of params', () => {
    const rendered = renderer.create(
      <AltinnSearchInput
        id={mockId}
        placeholder={mockPlaceholder}
        onChangeFunction={mockOnChangeFunction}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });
});
