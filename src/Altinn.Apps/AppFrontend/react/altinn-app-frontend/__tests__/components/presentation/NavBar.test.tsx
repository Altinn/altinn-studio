import 'jest';
import { mount } from 'enzyme';
import React from 'react';
import  NavBar from '../../../src/components/presentation/NavBar';


describe('>>> components/presentation/NavBar.tsx', () => {
  it('+++ should render back button by default', () => {
    const wrapper = mount(
      <NavBar
        language={{}}
        handleClose={null}
        handleBack={null}
      />,
    );
    expect(wrapper.find('div.a-modal-navbar')).toHaveLength(1);
    expect(wrapper.find('button.a-modal-close')).toHaveLength(1);
  });

  it('+++ should not render back button when hideBackButton is supplied', () => {
    const wrapper = mount(
      <NavBar
        language={{}}
        handleClose={null}
        handleBack={null}
        hideCloseButton={true}
      />,
    );
    expect(wrapper.find('div.a-modal-navbar')).toHaveLength(1);
    expect(wrapper.find('button.a-modal-close')).toHaveLength(0);
  });
});
