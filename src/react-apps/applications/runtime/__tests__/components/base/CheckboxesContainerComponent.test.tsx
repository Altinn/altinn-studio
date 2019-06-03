/* tslint:disable:jsx-wrap-multiline */
import { mount, shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { CheckboxContainerComponent } from '../../../src/components/base/CheckboxesContainerComponent';

describe('>>> components/base/CheckboxesContainerComponent.tsx', () => {
  let mockId: string;
  let mockOptions: any[];
  let mockFormData: any;
  let mockHandleDataChange: (value: any) => void;
  let mockGetTextResource: (resourceKey: string) => string;
  let mockPreselectedOptionIndex: number;
  let mockIsValid: boolean;
  let mockReadOnly: boolean;

  beforeEach(() => {
    mockId = 'mock-id';
    mockFormData = '';
    mockOptions = [{
      label: 'test-label-1',
      value: 'test-1',
    }, {
      label: 'test-label-2',
      value: 'test-2',
    }];
    mockHandleDataChange = (data: any) => null;
    mockGetTextResource = (resourceKey: string) => 'test';
    mockPreselectedOptionIndex = null;
    mockIsValid = true;
    mockReadOnly = false;
  });

  it('>>> Capture snapshot of CheckboxesContainerComponent', () => {
    const rendered = renderer.create(
      <CheckboxContainerComponent
        id={mockId}
        formData={'undefined'}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        validationMessages={{}}
        options={mockOptions}
        preselectedOptionIndex={mockPreselectedOptionIndex}
        readOnly={mockReadOnly}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });
  it('+++ should render correct states with no formdata', () => {
    const props = {
      id: mockId, formData: null, handleDataChange: mockHandleDataChange,
      getTextResource: mockGetTextResource, isValid: mockIsValid, options: mockOptions,
      preselectedOptionIndex: mockPreselectedOptionIndex, readOnly: mockReadOnly, validationMessages: {},
    };
    const state = { selected: [] };
    const checkbox = new CheckboxContainerComponent(props, state);
    expect(checkbox.props.formData).toBe(null);
    expect(checkbox.state.selected).toEqual([]);
    expect(checkbox.props.preselectedOptionIndex).toEqual(null);
  });
  it('+++ should render correct states with formdata', () => {
    const props = {
      id: mockId, formData: null, handleDataChange: mockHandleDataChange,
      getTextResource: mockGetTextResource, isValid: mockIsValid, options: mockOptions,
      preselectedOptionIndex: 1, readOnly: mockReadOnly, validationMessages: {},
    };
    const state = { selected: [] };
    const checkbox = new CheckboxContainerComponent(props, state);
    expect(checkbox.props.preselectedOptionIndex).toEqual(1);
    expect(checkbox.state.selected[checkbox.props.preselectedOptionIndex])
      .toEqual(mockOptions[checkbox.props.preselectedOptionIndex].value);
  });
  it('+++ should render editable component when readOnly is false', () => {
    const shallowCheckbox = shallow(
      <CheckboxContainerComponent
        id={mockId}
        formData={'undefined'}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        validationMessages={{}}
        options={mockOptions}
        preselectedOptionIndex={mockPreselectedOptionIndex}
        readOnly={mockReadOnly}
      />,
    );
    expect(shallowCheckbox.find({ type: 'checkbox' })).toHaveLength(2);
    expect(shallowCheckbox.find('.custom-control-label').first().hasClass('disabled-checkbox')).toBe(false);
  });
  it('+++ should render un-editable component when readOnly is true', () => {
    const shallowCheckbox = shallow(
      <CheckboxContainerComponent
        id={mockId}
        formData={'undefined'}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        validationMessages={{}}
        options={mockOptions}
        preselectedOptionIndex={mockPreselectedOptionIndex}
        readOnly={true}
      />,
    );
    expect(shallowCheckbox.find('.custom-control-label').first().hasClass('disabled-checkbox')).toBe(true);
  });
  it('+++ checked prop should change onClick', () => {
    const mountedCheckbox = mount(
      <CheckboxContainerComponent
        id={mockId}
        formData={null}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        validationMessages={{}}
        options={mockOptions}
        preselectedOptionIndex={mockPreselectedOptionIndex}
        readOnly={mockReadOnly}
      />,
    );
    const instance = mountedCheckbox.instance() as CheckboxContainerComponent;
    const checkbox = mountedCheckbox.find({ type: 'checkbox' }).first();
    const customControl = mountedCheckbox.find('.custom-control').first();
    const inputField = mountedCheckbox.find('input').first();

    expect(checkbox.props().checked).toBe(false);
    expect(customControl.is('div')).toBe(true);
    const spy = jest.spyOn(instance, 'onDataChanged');
    // Empty function was nessesary because input expects an onchange event
    const emptyFunctionSpy = jest.spyOn(instance, 'emptyFunction');
    customControl.simulate('click', { selectedValue: 'test-1', index: 0 });
    customControl.simulate('click', { selectedValue: 'test-1', index: 0 });
    inputField.simulate('change', { selectedValue: 'test-1', index: 0 });
    expect(spy).toHaveBeenCalled();
    expect(emptyFunctionSpy).toHaveBeenCalled();
    expect(checkbox.props().value).toBe('test-1');
  });
  it('+++ should have correct selected state', () => {
    const mountedCheckbox = mount(
      <CheckboxContainerComponent
        id={mockId}
        formData={'test-1'}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        validationMessages={{}}
        options={mockOptions}
        preselectedOptionIndex={mockPreselectedOptionIndex}
        readOnly={mockReadOnly}
      />,
    );
    const instance = mountedCheckbox.instance() as CheckboxContainerComponent;
    const customControl = mountedCheckbox.find('.custom-control').last();
    expect(instance.state.selected).toEqual(['test-1']);
    customControl.simulate('click', { selectedValue: 'test-2', index: 1 });
    expect(instance.state.selected).toEqual(['test-1', 'test-2']);
    customControl.simulate('click', { selectedValue: 'test-2', index: 1 });
    expect(instance.state.selected).toEqual(['test-1', '']);
  });
});
