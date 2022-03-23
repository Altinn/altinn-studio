import { mount } from 'enzyme';
import React from 'react';
import AltinnCheckBoxComponent from './AltinnCheckBox';

describe('AltinnCheckBox', () => {
  it('Should not be disabled by default', () => {
    const mountedAltinnCheckbox = mount(
      <AltinnCheckBoxComponent onChangeFunction={jest.fn()} checked={true} />,
    );

    mountedAltinnCheckbox.find({ type: 'checkbox' }).forEach((node) => {
      expect(node.props().disabled).toBe(false);
    });
  });
});
