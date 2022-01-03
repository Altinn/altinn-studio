import { FormControlLabel } from '@material-ui/core';
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { AltinnRadio } from '../../../components/AltinnRadio';

describe('>>> AltinnRadioButton.tsx', () => {
  let mockLabel: string;
  beforeEach(() => {
    mockLabel = 'mock-label';
  });

  it('+++ Should should render FormControlLabel wrapper when label is supplied', () => {
    const wrapper = mount(<AltinnRadio label={mockLabel} />);
    expect(wrapper.find(FormControlLabel)).toHaveLength(1);
  });

  it('+++ Should should not render FormControlLabel wrapper when no label is supplied', () => {
    const wrapper = mount(<AltinnRadio />);
    expect(wrapper.find(FormControlLabel)).toHaveLength(0);
  });
});
