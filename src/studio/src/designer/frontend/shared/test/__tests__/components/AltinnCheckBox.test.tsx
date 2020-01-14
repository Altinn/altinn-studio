import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import AltinnCheckBox from '../../../components/AltinnCheckBox';

describe('>>> AltinnCheckBox', () => {
  let mockOnChangeFunction: any;
  let mockChecked: boolean;
  beforeEach(() => {
    mockChecked = true;
    mockOnChangeFunction = () => {
      return false;
    };
  });

  it('+++ Should not be disabled on default', () => {
    const mountedAltinnCheckbox = mount(
      <AltinnCheckBox
        onChangeFunction={mockOnChangeFunction}
        checked={mockChecked}
      />,
    );
    mountedAltinnCheckbox.find({ type: 'checkbox' }).forEach((node) => {
      expect(node.props().disabled).toBe(false);
    });
  });
});
