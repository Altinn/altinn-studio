/* tslint:disable:jsx-wrap-multiline */
import { mount, shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { RadioButtonContainerComponent } from '../../../src/components/base/RadioButtonsContainerComponent';

describe('>>> components/base/RadioButtonsContainerComponent.tsx --- Snapshot', () => {
  let mockId: string;
  let mockOptions: any[];
  // tslint:disable-next-line:prefer-const
  let mockFormData: any;
  let mockHandleDataChange: (value: any) => void;
  let mockGetTextResource: (resourceKey: string) => string;
  let mockIsValid: boolean;
  let mockPreselectedOptionIndex: number;
  let mockReadOnly: boolean;

  beforeEach(() => {
    mockId = 'mock-id';
    mockOptions = [{
      label: 'test-label-1',
      value: 'test-1',
    }, {
      label: 'test-label-2',
      value: 'test-2',
    }];
    mockHandleDataChange = (data: any) => null;
    mockGetTextResource = (resourceKey: string) => 'test';
    mockIsValid = true;
    mockPreselectedOptionIndex = null;
    mockReadOnly = false;
  });

  it('>>> Capture snapshot of RadioButtonsContainerComponent', () => {
    const rendered = renderer.create(
      <RadioButtonContainerComponent
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        id={mockId}
        isValid={mockIsValid}
        getTextResource={mockGetTextResource}
        options={mockOptions}
        preselectedOptionIndex={mockPreselectedOptionIndex}
        readOnly={mockReadOnly}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });
  it('+++ should have correct state', () => {
    const shallowRadioButton = shallow(
      <RadioButtonContainerComponent
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        id={mockId}
        isValid={mockIsValid}
        getTextResource={mockGetTextResource}
        options={mockOptions}
        preselectedOptionIndex={mockPreselectedOptionIndex}
        readOnly={true}
      />,
    );
    expect(shallowRadioButton.find('input').first().props().checked).toBe(false);

  });
  it('+++ should render editable component when readOnly is false', () => {
    const shallowRadioButton = shallow(
      <RadioButtonContainerComponent
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        id={mockId}
        isValid={mockIsValid}
        getTextResource={mockGetTextResource}
        options={mockOptions}
        preselectedOptionIndex={mockPreselectedOptionIndex}
        readOnly={mockReadOnly}
      />,
    );
    expect(shallowRadioButton.find('.custom-control-label')).toHaveLength(2);
    expect(shallowRadioButton.find('.custom-control-label').first().hasClass('disabled-radio-button')).toBe(false);
  });
  it('+++ should render un-editable component when readOnly is true', () => {
    const shallowRadioButton = shallow(
      <RadioButtonContainerComponent
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        id={mockId}
        isValid={mockIsValid}
        getTextResource={mockGetTextResource}
        options={mockOptions}
        preselectedOptionIndex={mockPreselectedOptionIndex}
        readOnly={true}
      />,
    );
    expect(shallowRadioButton.find('.custom-control-label').first().hasClass('disabled-radio-button')).toBe(true);
  });
  it('+++ checked prop should change onClick', () => {
    const mountedRadioButton = mount(
      <RadioButtonContainerComponent
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        id={mockId}
        isValid={mockIsValid}
        getTextResource={mockGetTextResource}
        options={mockOptions}
        preselectedOptionIndex={mockPreselectedOptionIndex}
        readOnly={mockReadOnly}
      />,
    );
    const radio = mountedRadioButton.find({ type: 'radio' }).first();
    const customControl = mountedRadioButton.find('.custom-control').first();
    expect(radio.props().checked).toBe(false);
    expect(customControl.is('div')).toBe(true);
    customControl.simulate('click', { value: 'test-1' });
  });
});
