/* tslint:disable:jsx-wrap-multiline */
import { mount, shallow } from 'enzyme';
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
    mockFormData = null;
    mockHandleDataChange = () => null;
    mockIsValid = true;
    mockReadOnly = false;
    mockRequired = false;
    mockType = 'Input';
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
  it('+++ should match snapshot with formData', () => {
    const wrapper = shallow(
      <InputComponent
        id={mockId}
        formData={'value'}
        handleDataChange={mockHandleDataChange}
        isValid={mockIsValid}
        readOnly={mockReadOnly}
        required={mockRequired}
        type={mockType}
      />,
    );
    const instance = wrapper.instance() as InputComponent;
    expect(instance.state.value).toEqual('value');
  });
  it('+++ should have correct state with no formData', () => {
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
    const instance = wrapper.instance() as InputComponent;
    expect(instance.state.value).toEqual('');
  });

  it('+++ should call supplied update data function when value changes', () => {
    const wrapper = mount(
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
    const instance = wrapper.instance() as InputComponent;
    input.simulate('change', { target: { value: 'Some input' } });
    expect(instance.state.value).toEqual('Some input');

    const spy = jest.spyOn(instance, 'onDataChangeSubmit');
    instance.forceUpdate();
    input.simulate('blur', { target: { value: '' } });
    expect(spy).toHaveBeenCalled();
  });
});
