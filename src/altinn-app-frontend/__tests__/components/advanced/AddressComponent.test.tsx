
import { mount, shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import { AddressComponent } from '../../../src/components/advanced/AddressComponent';

describe('components > advanced > AddressComponent', () => {
  const mockId = 'mock-id';
  const mockFormData = { address: 'adresse 1' };
  const mockHandleDataChange = (data: any) => '';
  const mockGetTextResource = (resourceKey: string) => 'test';
  const mockIsValid = true;
  const mockSimplified = true;
  const mockReadOnly = false;
  const mockRequired = false;
  const mockDataBinding = {};
  const mockValidationMessages = {
    zipCode: null,
    houseNumber: null,
  };
  const mocktextResourceBindings = {};
  const mockLanguage = {
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

  it('should return simplified version when simplified', () => {
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

  it('should render editable component when readOnly is false', () => {
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

  it('should render disabled component when readOnly is true', () => {
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

  it('should return advanced version and disabled when not simplified and readOnly is true', () => {
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

  it('should render optional when required and readOnly is false', () => {
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

  it('should not render optional when labelSettings.optionalIndicator is false', () => {
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

  it('should not call handleDataChange when data is invalid', () => {
    const hanldeDataChangeSpy = jest.fn();
    const component = mount(
      <AddressComponent
        id={mockId}
        formData={mockFormData}
        handleDataChange={hanldeDataChangeSpy}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        simplified={mockSimplified}
        dataModelBindings={mockDataBinding}
        componentValidations={mockValidationMessages}
        readOnly={false}
        required={false}
        language={mockLanguage}
        textResourceBindings={mocktextResourceBindings}
      />);
    const input = component.find(`#address_zip_code_${mockId}`);
    input.simulate('change', { target: { value: '123'}})
    input.simulate('blur');
    expect(hanldeDataChangeSpy).toHaveBeenCalledTimes(0);
  });

  it('clearing a zip code should also clear post place', () => {
    const hanldeDataChangeSpy = jest.fn();
    const component = mount(
      <AddressComponent
        id={mockId}
        formData={{ zipCode: '4619', postPlace: 'Something'}}
        handleDataChange={hanldeDataChangeSpy}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        simplified={mockSimplified}
        dataModelBindings={mockDataBinding}
        componentValidations={mockValidationMessages}
        readOnly={false}
        required={false}
        language={mockLanguage}
        textResourceBindings={mocktextResourceBindings}
      />);
    const input = component.find(`#address_zip_code_${mockId}`);
    input.simulate('change', { target: { value: ''}})
    input.simulate('blur');
    expect(hanldeDataChangeSpy).toHaveBeenCalledWith('', 'zipCode');
    expect(hanldeDataChangeSpy).toHaveBeenCalledWith('', 'postPlace');
  });
});
