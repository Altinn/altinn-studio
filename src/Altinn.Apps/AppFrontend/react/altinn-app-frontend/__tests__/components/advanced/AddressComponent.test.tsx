
import { shallow } from 'enzyme';
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
  let mockId: string;
  let mockFormData: { [id: string]: string };
  let mockHandleDataChange: (value: any, key: string) => void;
  let mockGetTextResource: (key: string) => string;
  let mockIsValid: boolean;
  let mockSimplified: boolean;
  let mockValidationMessages: any;
  let mockDataBinding: any;
  let mockReadOnly: boolean;
  let mockRequired: boolean;
  let mockLanguage: any;
  let mocktextResourceBindings: any;

  mockId = 'mock-id';
  mockFormData = { address: 'adresse 1' };
  mockHandleDataChange = (data: any) => '';
  mockGetTextResource = (resourceKey: string) => 'test';
  mockIsValid = true;
  mockSimplified = true;
  mockReadOnly = false;
  mockRequired = false;
  mockDataBinding = {};
  mockValidationMessages = {
    zipCode: null,
    houseNumber: null,
  };
  mocktextResourceBindings = {};
  mockLanguage = {
    ux_editor: {
      modal_configure_address_component_address: 'Adresse',
      modal_configure_address_component_title_text_binding: 'Søk etter ledetekst for Adresse-komponenten',
      modal_configure_address_component_care_of: 'C/O eller annen tilleggsadresse',
      modal_configure_address_component_house_number: 'Bolignummer',
      modal_configure_address_component_house_number_helper: 'Om addressen er felles for flere boenhenter må du oppgi' +
      ' bolignummer. Den består av en bokstav og fire tall og skal være ført opp ved/på inngangsdøren din.',
      modal_configure_address_component_post_place: 'Poststed',
      modal_configure_address_component_simplified: 'Enkel',
      modal_configure_address_component_zip_code: 'Postnr',
    },
  };

  it('>>> Capture snapshot of AddressComponent', () => {
    const rendered = renderer.create(
      <AddressComponent
        id={mockId}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        simplified={mockSimplified}
        dataModelBindings={mockDataBinding}
        componentValidations={mockValidationMessages}
        readOnly={mockReadOnly}
        required={mockRequired}
        language={mockLanguage}
        textResourceBindings={mocktextResourceBindings}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ should return simplified version when simplified', () => {
    const shallowAddressComponent = shallow(
      <AddressComponent
        id={mockId}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        simplified={mockSimplified}
        dataModelBindings={mockDataBinding}
        componentValidations={mockValidationMessages}
        readOnly={mockReadOnly}
        required={mockRequired}
        language={mockLanguage}
        textResourceBindings={mocktextResourceBindings}
      />,
    );
    expect(shallowAddressComponent.find('input').length).toBe(3);
  });

  it('+++ should render editable component when readOnly is false', () => {
    const shallowAddressComponent = shallow(
      <AddressComponent
        id={mockId}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        simplified={mockSimplified}
        dataModelBindings={mockDataBinding}
        componentValidations={mockValidationMessages}
        readOnly={mockReadOnly}
        required={mockRequired}
        language={mockLanguage}
        textResourceBindings={mocktextResourceBindings}
      />,
    );
    expect(shallowAddressComponent.find('.address-component-small-inputs').hasClass('disabled')).toBe(false);
  });

  it('+++ should render disabled component when readOnly is true', () => {
    const shallowAddressComponent = shallow(
      <AddressComponent
        id={mockId}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        simplified={mockSimplified}
        dataModelBindings={mockDataBinding}
        componentValidations={mockValidationMessages}
        readOnly={true}
        required={mockRequired}
        language={mockLanguage}
        textResourceBindings={mocktextResourceBindings}
      />,
    );
    shallowAddressComponent.find('input').forEach((node: any) => {
      expect(node.hasClass('disabled')).toBe(true);
    });
  });

  it('+++ should return advanced version and disabled when not simplified and readOnly is true', () => {
    const shallowAddressComponent = shallow(
      <AddressComponent
        id={mockId}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        simplified={false}
        dataModelBindings={mockDataBinding}
        componentValidations={mockValidationMessages}
        readOnly={true}
        required={mockRequired}
        language={mockLanguage}
        textResourceBindings={mocktextResourceBindings}
      />,
    );
    shallowAddressComponent.find('input').forEach((node: any) => {
      expect(node.hasClass('disabled')).toBe(true);
    });
    expect(shallowAddressComponent.find('input').length).toBe(5);
  });

  it('+++ should render optional when required and readOnly is false', () => {
    const shallowAddressComponent = shallow(
      <AddressComponent
        id={mockId}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        simplified={mockSimplified}
        dataModelBindings={mockDataBinding}
        componentValidations={mockValidationMessages}
        readOnly={false}
        required={false}
        language={mockLanguage}
        textResourceBindings={mocktextResourceBindings}
      />,
    );
    expect(shallowAddressComponent.find('span.label-optional')).toHaveLength(2);
  });

  it('+++ should not render optional when labelSettings.optionalIndicator is false', () => {
    const shallowAddressComponent = shallow(
      <AddressComponent
        id={mockId}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        simplified={mockSimplified}
        dataModelBindings={mockDataBinding}
        componentValidations={mockValidationMessages}
        readOnly={false}
        required={false}
        labelSettings={{ optionalIndicator: false }}
        language={mockLanguage}
        textResourceBindings={mocktextResourceBindings}
      />,
    );
    expect(shallowAddressComponent.find('.label-optional')).toHaveLength(0);
  });
});
