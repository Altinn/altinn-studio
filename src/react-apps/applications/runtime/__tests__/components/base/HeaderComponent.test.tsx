import 'jest';
import * as React from 'react';

import { mount } from 'enzyme';

import { HeaderComponent } from '../../../src/components/base/HeaderComponent';

describe('>>> components/base/HeaderComponent.tsx --- Snapshot', () => {
  let mockId: string;
  let mockText: string;

  beforeEach(() => {
    mockId = 'mock-id';
    mockText = 'test';
  });

  it('+++ should render <h2> if size is \'L\'', () => {
    const wrapper = mount(
      <HeaderComponent
        id={mockId}
        text={mockText}
        size={'L'}
      />,
    );
    expect(wrapper.contains(<h2 id={'mock-id'}>test</h2>)).toBe(true);
  });

  it('+++ should render <h3> if size is \'M\'', () => {
    const wrapper = mount(
      <HeaderComponent
        id={mockId}
        text={mockText}
        size={'M'}
      />,
    );
    expect(wrapper.contains(<h3 id={'mock-id'}>test</h3>)).toBe(true);
  });

  it('+++ should render <h4> if size is \'S\'', () => {
    const wrapper = mount(
      <HeaderComponent
        id={mockId}
        text={mockText}
        size={'S'}
      />,
    );
    expect(wrapper.contains(<h4 id={'mock-id'}>test</h4>)).toBe(true);
  });

  it('+++ should render <h4> if size is not defined', () => {
    const wrapper = mount(
      <HeaderComponent
        id={mockId}
        text={mockText}
      />,
    );
    expect(wrapper.contains(<h4 id={'mock-id'}>test</h4>)).toBe(true);
  });
});
