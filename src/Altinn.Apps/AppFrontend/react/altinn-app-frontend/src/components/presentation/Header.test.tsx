import { mount } from 'enzyme';
import React from 'react';

import { ProcessTaskType } from '../../types';

import Header from './Header';

describe('components/presentation/Header.tsx', () => {
  it('should render as expected with header title', () => {
    const wrapper = mount(
      <Header language={{}} type={ProcessTaskType.Data} header='Test Header' />,
    );
    expect(wrapper.find('div.modal-header')).toHaveLength(1);
    expect(wrapper.text().includes('Test Header')).toBe(true);
  });

  it('should render with success modal and custom text when process is archived', () => {
    const wrapper = mount(
      <Header
        language={{
          receipt: {
            receipt: 'Kvittering',
          },
        }}
        type={ProcessTaskType.Archived}
      />,
    );
    expect(wrapper.find('div.a-modal-background-success')).toHaveLength(1);
    expect(wrapper.text().includes('Kvittering')).toBe(true);
  });
});
