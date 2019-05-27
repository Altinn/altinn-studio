/* tslint:disable:jsx-wrap-multiline */
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { DropdownComponent } from '../../../src/components/base/DropdownComponent';

describe('>>> components/base/DropdownComponent.tsx --- Snapshot', () => {
  let mockId: string;
  let mockOptions: any[];
  let mockFormData: any;
  let mockHandleDataChange: (value: any) => void;
  let mockGetTextResource: (resourceKey: string) => string;
  let mockIsValid: boolean;

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
    mockIsValid = true;
  });

  it('>>> Capture snapshot of DropdownComponent', () => {
    const rendered = renderer.create(
      <DropdownComponent
        id={mockId}
        options={mockOptions}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });
  it('+++ should trigger onDataChanged on change', () => {
    const mountedDropdownComponent = mount(
      <DropdownComponent
        id={mockId}
        options={mockOptions}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
      />,
    );
    const instance = mountedDropdownComponent.instance() as DropdownComponent;
    const spy = jest.spyOn(instance, 'onDataChanged');
    instance.forceUpdate();
    mountedDropdownComponent.find('select').simulate('change', { target: { value: 'test-2' } });
    expect(spy).toHaveBeenCalled();
  });
});
