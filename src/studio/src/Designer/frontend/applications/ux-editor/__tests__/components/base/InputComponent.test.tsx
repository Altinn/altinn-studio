import { shallow } from 'enzyme';
import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { InputComponent } from '../../../src/components/base/InputComponent';

describe('>>> components/base/InputComponent.tsx --- Snapshot', () => {
  let mockId: string;
  let mockComponent: any;
  // tslint:disable-next-line:prefer-const
  let mockFormData: any;
  let mockHandleDataChange: () => void;
  let mockIsValid: boolean;

  beforeEach(() => {
    mockId = 'mock-id';
    mockComponent = {
      id: mockId,
      component: 'Input',
      type: 'text',
      disabled: false,
      required: false,
    };
    mockHandleDataChange = () => null;
    mockIsValid = true;
  });

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
      <InputComponent
        id={mockId}
        component={mockComponent}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        isValid={mockIsValid}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ should call supplied update data function when value changes', () => {
    const wrapper = shallow(
      <InputComponent
        id={mockId}
        component={mockComponent}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        isValid={mockIsValid}
      />,
    );
    const input = wrapper.find('input');
    input.simulate('onBlur');
  });
});
