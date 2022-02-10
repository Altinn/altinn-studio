import React from 'react';
import { Typography } from '@material-ui/core';
import { mount } from 'enzyme';
import * as renderer from 'react-test-renderer';

import AltinnRadioComponent from './AltinnRadio';
import AltinnRadioGroupComponent from './AltinnRadioGroup';

describe('AltinnRadioButtonGroup', () => {
  let mockValue: string;
  let mockId: string;
  let mockDescription: string;
  let mockOnChange: any;
  let mockRow: boolean;
  let mockClassName: any;

  beforeEach(() => {
    mockValue = 'mock-value';
    mockId = 'mock-id';
    mockDescription = 'mock-description';
    mockRow = true;
    mockClassName = 'mock-classname';
    mockOnChange = jest.fn();
  });

  it('Should match snapshot with the least amount of params', () => {
    const rendered = renderer.create(
      <AltinnRadioGroupComponent value={mockValue} />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('Should match snapshot with all params ', () => {
    const rendered = renderer.create(
      <AltinnRadioGroupComponent
        value={mockValue}
        onChange={mockOnChange}
        id={mockId}
        description={mockDescription}
        row={mockRow}
        className={mockClassName}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('Should render children', () => {
    const wrapper = mount(
      <AltinnRadioGroupComponent value={mockValue}>
        <AltinnRadioComponent />
        <AltinnRadioComponent />
      </AltinnRadioGroupComponent>,
    );
    expect(wrapper.find(AltinnRadioComponent)).toHaveLength(2);
  });

  it('Should render description typography if description is supplied', () => {
    const wrapper = mount(
      <AltinnRadioGroupComponent
        value={mockValue}
        description={mockDescription}
      />,
    );
    expect(wrapper.find(Typography)).toHaveLength(1);
  });
});
