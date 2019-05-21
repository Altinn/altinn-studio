/* tslint:disable:jsx-wrap-multiline */
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { mount } from 'enzyme';
import { TextAreaComponent } from '../../../src/components/base/TextAreaComponent';

describe('>>> components/base/TextAreaComponent.tsx', () => {
  let mockId: string;
  // tslint:disable-next-line:prefer-const
  let mockFormData: any;
  let mockHandleDataChange: (value: any) => void;
  let mockIsValid: boolean;
  let mockReadOnly: boolean;

  beforeEach(() => {
    mockId = 'mock-id';
    mockHandleDataChange = (data: any) => null;
    mockIsValid = true;
    mockReadOnly = false;
  });

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
      <TextAreaComponent
        id={mockId}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        isValid={mockIsValid}
        readOnly={mockReadOnly}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ should set formdata on change', () => {
    const wrapper = mount(
      <TextAreaComponent
        id={mockId}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        isValid={mockIsValid}
        readOnly={mockReadOnly}
      />,
    );
    const textArea = wrapper.find('textarea');
    const instance = wrapper.instance() as TextAreaComponent;
    const spy = jest.spyOn(instance, 'onDataChanged');
    instance.forceUpdate();
    textArea.simulate('change', { target: { value: '' } });
    expect(spy).toHaveBeenCalled();
  });

  it('+++ should render editable component when readOnly is false', () => {
    const wrapper = mount(
      <TextAreaComponent
        id={mockId}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        isValid={mockIsValid}
        readOnly={mockReadOnly}
      />,
    );
    expect(wrapper.find('textarea').hasClass('disabled')).toBe(false);
    expect(wrapper.find('textarea').prop('disabled')).toBe(false);
  });

  it('+++ should render un-editable component when readOnly is true', () => {
    const wrapper = mount(
      <TextAreaComponent
        id={mockId}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        isValid={mockIsValid}
        readOnly={true}
      />,
    );
    expect(wrapper.find('textarea').hasClass('disabled')).toBe(true);
    expect(wrapper.find('textarea').prop('disabled')).toBe(true);
  });

});
