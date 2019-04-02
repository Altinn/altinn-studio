import { mount, shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { AddressComponent } from '../../../src/components/advanced/AddressComponent';

export interface ITextResourceBindings {
  [id: string]: string;
}
export enum AddressKeys {
  address = 'address',
  zipCode = 'zipCode',
  postPlace = 'postPlace',
  careOf = 'careOf',
  houseNumber = 'houseNumber',
}

describe('>>> components/advanced/AddressComponent.tsx snapshot', () => {
  let mockComponent: any;
  // tslint:disable-next-line:prefer-const
  let mockFormData: any;
  let mockHandleDataChange: (value: any) => void;
  let mockGetTextResource: (resourceKey: string) => string;
  let mockTextResourceBindings: ITextResourceBindings;
  let mockIsValid: boolean;
  let mockSimplified: boolean;
  let mockReadOnly: boolean;
  let mockValidations: any;

  beforeEach(() => {
    mockComponent = {
      id: 'mock-component-id',
      component: 'AddressComponent',
      readOnly: mockReadOnly,
      simplified: mockSimplified,
      textResourceBindings: mockTextResourceBindings,
    };
  });
  mockHandleDataChange = (data: any) => null;
  mockGetTextResource = (resourceKey: string) => 'test';
  mockIsValid = true;
  mockSimplified = true;
  mockReadOnly = false;
  mockTextResourceBindings = {};
  mockValidations = {
    zipCode: null,
    houseNumber: null,
  };

  it('>>> Capture snapshot of AddressComponent', () => {
    const rendered = renderer.create(
      <AddressComponent
        component={mockComponent}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        simplified={mockSimplified}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });
  it('+++ should return simplified version when simplified', () => {
    const shallowAddressComponent = shallow(
      <AddressComponent
        component={mockComponent}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        simplified={mockSimplified}
      />,
    );
    expect(shallowAddressComponent.find('input').length).toBe(3);
  });
  it('+++ should return advanced version when not simplified', () => {
    const mountedAddressComponent = mount(
      <AddressComponent
        component={{
          id: 'mock-component-id',
          component: 'AddressComponent',
          readOnly: mockReadOnly,
          simplified: false,
          textResourceBindings: mockTextResourceBindings,
        }}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        simplified={mockSimplified}
      />,
    );
    const instance = mountedAddressComponent.instance() as AddressComponent;
    instance.setState({ ...mockValidations });
    const spy = jest.spyOn(instance, 'joinValidationMessages');
    instance.render();

    expect(spy).toHaveBeenCalled();
    expect(mountedAddressComponent.find('input').length).toBe(5);
  });
  it('+++ should render editable component when readOnly is false', () => {
    const shallowAddressComponent = shallow(
      <AddressComponent
        component={mockComponent}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        simplified={mockSimplified}
      />,
    );
    expect(shallowAddressComponent.find('.address-component-small-inputs').hasClass('disabled')).toBe(false);
  });
  it('+++ should render disabled component when readOnly is true', () => {
    const shallowAddressComponent = shallow(
      <AddressComponent
        component={{
          id: 'mock-component-id',
          component: 'AddressComponent',
          readOnly: true,
          simplified: mockSimplified,
          textResourceBindings: mockTextResourceBindings,
        }}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        simplified={mockSimplified}
      />,
    );
    shallowAddressComponent.find('input').forEach((node: any) => {
      expect(node.hasClass('disabled')).toBe(true);
    });
  });
  it('+++ should return advanced version and disabled when not simplified and readOnly is true', () => {
    const shallowAddressComponent = shallow(
      <AddressComponent
        component={{
          id: 'mock-component-id',
          component: 'AddressComponent',
          readOnly: true,
          simplified: false,
          textResourceBindings: mockTextResourceBindings,
        }}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        simplified={mockSimplified}
      />,
    );
    shallowAddressComponent.find('input').forEach((node: any) => {
      expect(node.hasClass('disabled')).toBe(true);
    });
    expect(shallowAddressComponent.find('input').length).toBe(5);
  });
});
