import { FormControlLabel } from '@material-ui/core';
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import AltinnRadio from '../../src/components/AltinnRadio';

describe('>>> AltinnRadioButton.tsx', () => {
  let mockValue: string;
  let mockId: string;
  let mockChecked: boolean;
  let mockLabel: string;
  let mockOnChange: any;
  beforeEach(() => {
    mockValue = 'mock-value';
    mockId = 'mock-id';
    mockChecked = true;
    mockLabel = 'mock-label';
    mockOnChange = () => { /**/ };
  });

  it('+++ Should match snapshot with the least amount of params', () => {
    const rendered = renderer.create(
      <AltinnRadio />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ Should match snapshot with all params ', () => {
    const rendered = renderer.create(
      <AltinnRadio
        value={mockValue}
        label={mockLabel}
        onChange={mockOnChange}
        checked={mockChecked}
        id={mockId}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ Should should render FormControlLabel wrapper when label is supplied', () => {
    const wrapper = mount(
      <AltinnRadio
        label={mockLabel}
      />,
    );
    expect(wrapper.find(FormControlLabel)).toHaveLength(1);
  });

  it('+++ Should should not render FormControlLabel wrapper when no label is supplied', () => {
    const wrapper = mount(
      <AltinnRadio />,
    );
    expect(wrapper.find(FormControlLabel)).toHaveLength(0);
  });
});
