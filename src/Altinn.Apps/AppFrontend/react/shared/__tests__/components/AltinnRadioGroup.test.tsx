import { Typography } from '@material-ui/core';
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import AltinnRadio from '../../src/components/AltinnRadio';
import AltinnRadioGroup from '../../src/components/AltinnRadioGroup';

describe('>>> AltinnRadioButtonGroup.tsx', () => {
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
    mockOnChange = () => { /**/ };
  });

  it('+++ Should match snapshot with the least amount of params', () => {
    const rendered = renderer.create(
      <AltinnRadioGroup
        value={mockValue}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ Should match snapshot with all params ', () => {
    const rendered = renderer.create(
      <AltinnRadioGroup
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
