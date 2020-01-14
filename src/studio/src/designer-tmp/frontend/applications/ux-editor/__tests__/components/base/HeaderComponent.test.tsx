import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { mount } from 'enzyme';

import { HeaderComponent } from '../../../src/components/base/HeaderComponent';

describe('>>> components/base/HeaderComponent.tsx --- Snapshot', () => {
  let mockComponent: any;
  let mockText: string;
  let mockSize: string;

  beforeEach(() => {
    mockComponent = {
      id: 'test-id',
      title: 'test-headercomponent',
      component: 'Header',
    };
    mockText = 'test';
    mockSize = 'S';
  });

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
      <HeaderComponent
        component={mockComponent}
        text={mockText}
        size={mockSize}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ should render <h2> if size is \'L\'', () => {
    const wrapper = mount(
      <HeaderComponent
        component={mockComponent}
        text={mockText}
        size={'L'}
      />,
    );
    expect(wrapper.contains(<h2 id={'test-id'}>test</h2>)).toBe(true);
  });

  it('+++ should render <h3> if size is \'M\'', () => {
    const wrapper = mount(
      <HeaderComponent
        component={mockComponent}
        text={mockText}
        size={'M'}
      />,
    );
    expect(wrapper.contains(<h3 id={'test-id'}>test</h3>)).toBe(true);
  });

  it('+++ should render <h4> if size is \'S\'', () => {
    const wrapper = mount(
      <HeaderComponent
        component={mockComponent}
        text={mockText}
        size={'S'}
      />,
    );
    expect(wrapper.contains(<h4 id={'test-id'}>test</h4>)).toBe(true);
  });

  it('+++ should render <h4> if size is not defined', () => {
    const wrapper = mount(
      <HeaderComponent
        component={mockComponent}
        text={mockText}
      />,
    );
    expect(wrapper.contains(<h4 id={'test-id'}>test</h4>)).toBe(true);
  });
});
