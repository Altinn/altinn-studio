import { shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { AddressComponent } from '../../../src/components/advanced/AddressComponent';

export interface ITextResourceBindings {
  [id: string]: string;
}

describe('>>> components/advanced/AddressComponent.tsx snapshot', () => {
  let mockComponent: any;
  // tslint:disable-next-line:prefer-const
  let mockFormData: any;
  let mockHandleDataChange: (value: any) => void;
  let mockGetTextResource: (resourceKey: string) => string;
  // let mockTextResourceBindings: ITextResourceBindings;
  let mockIsValid: boolean;
  let mockSimplified: boolean;
  let mockReadOnly: boolean;

  beforeEach(() => {
    mockComponent = {
      component: 'AddressComponent',
      readOnly: mockReadOnly,
      simplified: mockSimplified,
    };
  });
  mockHandleDataChange = (data: any) => null;
  mockGetTextResource = (resourceKey: string) => 'test';
  mockIsValid = true;
  mockSimplified = true;
  mockReadOnly = false;
  // mockTextResourceBindings = 'test';

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

});
