import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import AltinnIconButton from '../../src/components/AltinnIconButton';

describe('>>> AltinnIconButton--- Snapshot', () => {
  let mockOnclickFunction: any;
  let mockClassName: string;
  let mockIconClass: string;
  let mockBtnText: string;
  beforeEach(() => {
    mockIconClass = 'ai ai-write';
    mockBtnText = 'mock btn text';
    mockClassName = 'mock-class-name';
    mockOnclickFunction = () => {
      return false;
    };
  });

  it('+++ Should match snapshot with the least amount of params', () => {
    const rendered = renderer.create(
      <AltinnIconButton
        iconClass={mockIconClass}
        btnText={mockBtnText}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ Should match snapshot with all params specified', () => {
    const rendered = renderer.create(
      <AltinnIconButton
        iconClass={mockIconClass}
        btnText={mockBtnText}
        className={mockClassName}
        onclickFunction={mockOnclickFunction}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });
});
