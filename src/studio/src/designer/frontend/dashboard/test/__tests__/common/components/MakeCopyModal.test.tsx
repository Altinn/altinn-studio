import 'jest';
import * as React from 'react';
import { mount } from 'enzyme';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';

import ErrorPopover from 'app-shared/components/ErrorPopover';
import { MakeCopyModal } from 'common/components/MakeCopyModal';

describe('Dashboard > Common > Components > MakeCopyModal', () => {
  it('should show error message when clicking confirm without adding name', () => {
    const component = mountComponent();
    expect(component.find(ErrorPopover).prop('anchorEl')).toBe(null);

    const cloneBtn = component.find('button#clone-button');

    cloneBtn.simulate('click');

    expect(component.find(ErrorPopover).prop('anchorEl')).not.toBe(null);
    expect(component.find('button#clone-button').exists()).toBe(true);
    expect(component.find('button#cancel-button').exists()).toBe(true);
  });

  it('should not show error message when clicking confirm and name is added', () => {
    const component = mountComponent();
    expect(component.find(ErrorPopover).prop('anchorEl')).toBe(null);

    const cloneBtn = component.find('button#clone-button');
    const input = component.find('#new-clone-name-input').hostNodes();

    input.simulate('change', { target: { value: 'new-name' } });
    cloneBtn.simulate('click');

    expect(component.find(ErrorPopover).prop('anchorEl')).toBe(null);
    expect(component.find('button#clone-button').exists()).toBe(false);
    expect(component.find('button#cancel-button').exists()).toBe(false);
  });

  it('should show error message when clicking confirm and name is too long', () => {
    const component = mountComponent();
    expect(component.find(ErrorPopover).prop('anchorEl')).toBe(null);

    const cloneBtn = component.find('button#clone-button');
    const input = component.find('#new-clone-name-input').hostNodes();

    input.simulate('change', {
      target: { value: 'this-new-name-is-way-too-long-to-be-valid' },
    });
    cloneBtn.simulate('click');

    expect(component.find(ErrorPopover).prop('anchorEl')).not.toBe(null);
    expect(component.find('button#clone-button').exists()).toBe(true);
    expect(component.find('button#cancel-button').exists()).toBe(true);
  });

  it('should show error message when clicking confirm and name contains invalid characters', () => {
    const component = mountComponent();
    expect(component.find(ErrorPopover).prop('anchorEl')).toBe(null);

    const cloneBtn = component.find('button#clone-button');
    const input = component.find('#new-clone-name-input').hostNodes();

    input.simulate('change', {
      target: { value: 'this name is invalid' },
    });
    cloneBtn.simulate('click');

    expect(component.find(ErrorPopover).prop('anchorEl')).not.toBe(null);
    expect(component.find('button#clone-button').exists()).toBe(true);
    expect(component.find('button#cancel-button').exists()).toBe(true);
  });
});

const mountComponent = () => {
  const initialState = {
    language: {
      language: {},
    },
  };
  const store = configureStore()(initialState);
  const anchor = document.querySelector('body');

  return mount(
    <Provider store={store}>
      <MakeCopyModal
        anchorEl={anchor}
        handleClose={jest.fn()}
        serviceFullName='Full name'
      />
    </Provider>,
    { context: { store } },
  );
};
