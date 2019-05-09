/* tslint:disable:jsx-wrap-multiline */
import { mount, shallow } from 'enzyme';
import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { CheckboxContainerComponent } from '../../../src/components/base/CheckboxesContainerComponent';

describe('>>> components/base/CheckboxesContainerComponent.tsx --- Snapshot', () => {
  let mockId: string;
  let mockComponent: any;
  // tslint:disable-next-line:prefer-const
  let mockFormData: any;
  let mockHandleDataChange: (value: any) => void;
  let mockGetTextResource: (resourceKey: string) => string;
  let mockIsValid: boolean;
  let mockDesignMode: boolean;

  beforeEach(() => {
    mockId = 'mock-id';
    mockComponent = {
      id: mockId,
      title: 'test-checkboxescontainer',
      component: 'Checkboxes',
      readOnly: false,
      options: [{
        label: 'test-label-1',
        value: 'test-1',
      }, {
        label: 'test-label-2',
        value: 'test-2',
      }],
    };
    mockHandleDataChange = (data: any) => null;
    mockGetTextResource = (resourceKey: string) => 'test';
    mockIsValid = true;
    mockDesignMode = true;
  });

  it('>>> Capture snapshot of CheckboxesContainerComponent', () => {
    const rendered = renderer.create(
      <CheckboxContainerComponent
        id={mockId}
        component={mockComponent}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        designMode={mockDesignMode}
        validationMessages={{}}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });
  it('+++ should render editable component when readOnly is false', () => {
    const shallowCheckbox = shallow(
      <CheckboxContainerComponent
        id={mockId}
        component={mockComponent}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        designMode={mockDesignMode}
        validationMessages={{}}
      />,
    );
    expect(shallowCheckbox.find({ type: 'checkbox' })).toHaveLength(2);
    expect(shallowCheckbox.find('.custom-control-label').first().hasClass('disabled-checkbox')).toBe(false);
  });
  it('+++ should render un-editable component when readOnly is true', () => {
    const shallowCheckbox = shallow(
      <CheckboxContainerComponent
        id={mockId}
        component={{
          id: mockId,
          component: 'Checkboxes',
          readOnly: true,
          options: [{
            label: 'test-label-1',
            value: 'test-1',
          }, {
            label: 'test-label-2',
            value: 'test-2',
          }],
        }}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        designMode={mockDesignMode}
        validationMessages={{}}
      />,
    );
    expect(shallowCheckbox.find('.custom-control-label').first().hasClass('disabled-checkbox')).toBe(true);
  });
  it('+++ checked prop should change onClick', () => {
    const mountedCheckbox = mount(
      <CheckboxContainerComponent
        id={mockId}
        component={mockComponent}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        designMode={mockDesignMode}
        validationMessages={{}}
      />,
    );
    const instance = mountedCheckbox.instance() as CheckboxContainerComponent;
    const checkbox = mountedCheckbox.find({ type: 'checkbox' }).first();
    const customControl = mountedCheckbox.find('.custom-control').first();
    expect(checkbox.props().checked).toBe(false);
    expect(customControl.is('div')).toBe(true);
    const spy = jest.spyOn(instance, 'onDataChanged');
    customControl.simulate('click', { value: 'test-1' });
    customControl.simulate('click', { value: 'test-1' });
    expect(spy).toHaveBeenCalled();
    expect(checkbox.props().value).toBe('test-1');
  });
});
