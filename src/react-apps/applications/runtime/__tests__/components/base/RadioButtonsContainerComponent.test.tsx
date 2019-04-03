import { mount, shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { RadioButtonContainerComponent } from '../../../src/components/base/RadioButtonsContainerComponent';

describe('>>> components/base/RadioButtonsContainerComponent.tsx --- Snapshot', () => {
  let mockId: string;
  let mockComponent: any;
  // tslint:disable-next-line:prefer-const
  let mockFormData: any;
  let mockHandleDataChange: (value: any) => void;
  let mockGetTextResource: (resourceKey: string) => string;
  let mockIsValid: boolean;
  let mockDesignMode: boolean;
  let mockReadOnly: boolean;

  beforeEach(() => {
    mockId = 'mock-id';
    mockComponent = {
      id: 'mock-component-id',
      component: 'RadioButtons',
      readOnly: mockReadOnly,
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
    mockReadOnly = false;
  });

  it('>>> Capture snapshot of RadioButtonsContainerComponent', () => {
    const rendered = renderer.create(
      <RadioButtonContainerComponent
        id={mockId}
        component={mockComponent}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        designMode={mockDesignMode}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });
  it('+++ should render editable component when readOnly is false', () => {
    const shallowRadioButton = shallow(
      <RadioButtonContainerComponent
        id={mockId}
        component={mockComponent}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        designMode={mockDesignMode}
      />,
    );
    expect(shallowRadioButton.find('.custom-control-label')).toHaveLength(2);
    expect(shallowRadioButton.find('.custom-control-label').first().hasClass('disabled-radio-button')).toBe(false);
  });
  it('+++ should render un-editable component when readOnly is true', () => {
    const shallowRadioButton = shallow(
      <RadioButtonContainerComponent
        id={mockId}
        component={{
          id: 'mock-component-id',
          component: 'RadioButtons',
          readOnly: true,
          options: [{
            label: 'test-label-1',
            value: 'test-1',
          }, {
            label: 'test-label-1',
            value: 'test-1',
          }],
        }}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        designMode={mockDesignMode}
      />,
    );
    expect(shallowRadioButton.find('.custom-control-label').first().hasClass('disabled-radio-button')).toBe(true);
  });
  it('+++ checked prop should change onClick', () => {
    const mountedRadioButton = mount(
      <RadioButtonContainerComponent
        id={mockId}
        component={mockComponent}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        designMode={mockDesignMode}
      />,
    );
    const radio = mountedRadioButton.find({ type: 'radio' }).first();
    const customControl = mountedRadioButton.find('.custom-control').first();
    expect(radio.props().checked).toBe(false);
    expect(customControl.is('div')).toBe(true);
    customControl.simulate('click', { value: 'test-1' });
  });
});
