import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { mount } from 'enzyme';
import { TextAreaComponent } from '../../../src/components/base/TextAreaComponent';

describe('>>> components/base/TextAreaComponent.tsx', () => {
  let mockId: string;
  let mockComponent: any;
  // tslint:disable-next-line:prefer-const
  let mockFormData: any;
  let mockHandleDataChange: (value: any) => void;
  let mockIsValid: boolean;

  beforeEach(() => {
    mockId = 'mock-id';
    mockComponent = {
      id: 'mock-component-id',
      component: 'TextArea',
      readOnly: false,
    };
    mockHandleDataChange = (data: any) => null;
    mockIsValid = true;
  });

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
      <TextAreaComponent
        id={mockId}
        component={mockComponent}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        isValid={mockIsValid}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ should render editable component when readOnly is false', () => {
    const wrapper = mount(
      <TextAreaComponent
        id={mockId}
        component={mockComponent}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        isValid={mockIsValid}
      />,
    );
    expect(wrapper.find('#mock-component-id').hasClass('disabled')).toBe(false);
    expect(wrapper.find('#mock-component-id').prop('disabled')).toBe(false);
  });

  it('+++ should render un-editable component when readOnly is true', () => {
    const wrapper = mount(
      <TextAreaComponent
        id={mockId}
        component={{
          id: 'mock-component-id',
          component: 'TextArea',
          readOnly: true,
        }}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        isValid={mockIsValid}
      />,
    );
    expect(wrapper.find('#mock-component-id').hasClass('disabled')).toBe(true);
    expect(wrapper.find('#mock-component-id').prop('disabled')).toBe(true);
  });

});
