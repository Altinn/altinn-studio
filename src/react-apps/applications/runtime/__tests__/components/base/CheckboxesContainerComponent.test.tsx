import { mount, shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { CheckboxContainerComponent } from '../../../src/components/base/CheckboxesContainerComponent';

describe('>>> components/base/CheckboxesContainerComponent.tsx --- Snapshot', () => {
  let mockId: string;
  let mockOptions: any[];
  // tslint:disable-next-line:prefer-const
  let mockFormData: any;
  let mockHandleDataChange: (value: any) => void;
  let mockGetTextResource: (resourceKey: string) => string;
  let mockPreselectedOptionIndex: number;
  let mockIsValid: boolean;
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
