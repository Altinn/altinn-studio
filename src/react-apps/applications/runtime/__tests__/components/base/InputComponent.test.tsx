import { shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { InputComponent } from '../../../src/components/base/InputComponent';

describe('>>> components/base/InputComponent.tsx --- Snapshot', () => {
  let mockId: string;
  let mockFormData: any;
  let mockHandleDataChange: () => void;
  let mockIsValid: boolean;
  let mockReadOnly: boolean;
  let mockRequired: boolean;
  let mockType: string;

  beforeEach(() => {
    mockId = 'mock-id';
    mockFormData = '';
    mockHandleDataChange = () => null;
    mockIsValid = true;
    mockReadOnly = false;
    mockRequired = false;
    mockType = 'text';
  });

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
      <InputComponent
        id={mockId}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        isValid={mockIsValid}
        readOnly={mockReadOnly}
        required={mockRequired}
        type={mockType}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ should call supplied update data function when value changes', () => {
    const wrapper = shallow(
      <InputComponent
        id={mockId}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        isValid={mockIsValid}
        readOnly={mockReadOnly}
        required={mockRequired}
        type={mockType}
      />,
    );
    const input = wrapper.find('input');
    input.simulate('onBlur');
  });
});
