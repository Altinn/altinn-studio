import { Typography } from '@material-ui/core';
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import AltinnRadio from '../../src/components/AltinnRadio';
import AltinnRadioGroup from '../../src/components/AltinnRadioGroup';

describe('>>> AltinnRadioButtonGroup.tsx', () => {
  let mockValue: string;
  let mockDescription: string;
  beforeEach(() => {
    mockValue = 'mock-value';
    mockDescription = 'mock-description';
  });

  it('+++ Should render children', () => {
    const wrapper = mount(
      <AltinnRadioGroup value={mockValue}>
        <AltinnRadio />
        <AltinnRadio />
      </AltinnRadioGroup>,
    );
    expect(wrapper.find(AltinnRadio)).toHaveLength(2);
  });

  it('+++ Should render description typography if description is supplied', () => {
    const wrapper = mount(
      <AltinnRadioGroup value={mockValue} description={mockDescription} />,
    );
    expect(wrapper.find(Typography)).toHaveLength(1);
  });

});
