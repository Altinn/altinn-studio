/* eslint-disable no-undef */
import * as renderer from 'react-test-renderer';
import * as React from 'react';
import { mount } from 'enzyme';
import AltinnSubstatusPaper from '../../../src/components/molecules/AltinnSubstatusPaper';
import 'jest';

describe('>>> AltinnSubstatusPaper.tsx', () => {
  let label: string;
  let description: string;
  beforeAll(() => {
    label = 'The label';
    description = 'The description';
  });

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
      <AltinnSubstatusPaper
        label={label}
        description={description}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ should render label and description', () => {
    const wrapper = mount(
      <AltinnSubstatusPaper
        label={label}
        description={description}
      />,
    );
    expect(wrapper.find(`#substatus-label`).first().text()).toEqual(label);
    expect(wrapper.find(`#substatus-description`).first().text()).toEqual(description);
  });
});
