import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { mount } from 'enzyme';

import { HeaderComponent } from '../../../src/components/base/HeaderComponent';

describe('>>> components/base/HeaderComponent.tsx --- Snapshot', () => {
  let mockId: string;
  let mockText: string;
  let mockSize: string;

  beforeEach(() => {
    mockId = 'mock-id';
    mockText = 'test';
    mockSize = 'S';
  });

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
      <HeaderComponent
        id={mockId}
        text={mockText}
        size={mockSize}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ should render <h2> if size is \'L\'', () => {
    const wrapper = mount(
      <HeaderComponent
        id={mockId}
        text={mockText}
        size={'L'}
      />,
    );
    expect(wrapper.find('h2')).toHaveLength(1);
    expect(wrapper.find(`h2[id='${mockId}']`)).toHaveLength(1);
    expect(wrapper.find('h3')).toHaveLength(0);
    expect(wrapper.find('h4')).toHaveLength(0);
  });

  it('+++ should render <h3> if size is \'M\'', () => {
    const wrapper = mount(
      <HeaderComponent
        id={mockId}
        text={mockText}
        size={'M'}
      />,
    );
    expect(wrapper.find('h2')).toHaveLength(0);
    expect(wrapper.find('h3')).toHaveLength(1);
    expect(wrapper.find(`h3[id='${mockId}']`)).toHaveLength(1);
    expect(wrapper.find('h4')).toHaveLength(0);
  });

  it('+++ should render <h4> if size is \'S\'', () => {
    const wrapper = mount(
      <HeaderComponent
        id={mockId}
        text={mockText}
        size={'S'}
      />,
    );

    expect(wrapper.find('h2')).toHaveLength(0);
    expect(wrapper.find('h3')).toHaveLength(0);
    expect(wrapper.find(`h4[id='${mockId}']`)).toHaveLength(1);
    expect(wrapper.find('h4')).toHaveLength(1);

  });

  it('+++ should render <h4> if size is not defined', () => {
    const wrapper = mount(
      <HeaderComponent
        id={mockId}
        text={mockText}
      />,
    );
    expect(wrapper.find(`h4[id='${mockId}']`)).toHaveLength(1);
  });
});
