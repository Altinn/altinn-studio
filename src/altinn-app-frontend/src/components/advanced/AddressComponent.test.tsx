import * as React from 'react';
import { Provider } from 'react-redux';

import { fireEvent, render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import mockAxios from 'jest-mock-axios';
import configureStore from 'redux-mock-store';
import { mockComponentProps } from 'testUtils';

import { AddressComponent } from 'src/components/advanced/AddressComponent';
import type { IAddressComponentProps } from 'src/components/advanced/AddressComponent';

const render = (props: Partial<IAddressComponentProps> = {}) => {
  const createStore = configureStore();
  const mockLanguage = {
    ux_editor: {
      modal_configure_address_component_address: 'Adresse',
      modal_configure_address_component_title_text_binding:
        'Søk etter ledetekst for Adresse-komponenten',
      modal_configure_address_component_care_of:
        'C/O eller annen tilleggsadresse',
      modal_configure_address_component_house_number: 'Bolignummer',
      modal_configure_address_component_house_number_helper:
        'Om addressen er felles for flere boenhenter må du oppgi' +
        ' bolignummer. Den består av en bokstav og fire tall og skal være ført opp ved/på inngangsdøren din.',
      modal_configure_address_component_post_place: 'Poststed',
      modal_configure_address_component_simplified: 'Enkel',
      modal_configure_address_component_zip_code: 'Postnr',
    },
  };

  const allProps: IAddressComponentProps = {
    ...mockComponentProps,
    formData: {
      address: 'adresse 1',
    },
    isValid: true,
    simplified: true,
    dataModelBindings: {},
    language: mockLanguage,
    readOnly: false,
    required: false,
    textResourceBindings: {},
    ...props,
  };

  const mockStore = createStore({ language: { language: mockLanguage } });

  rtlRender(
    <Provider store={mockStore}>
      <AddressComponent {...allProps} />
    </Provider>,
  );
};

const getField = ({ method, regex }) =>
  screen[method]('textbox', {
    name: regex,
  });

const getAddressField = ({
  useQuery = false,
  optional = false,
  required = false,
} = {}) => {
  const method = useQuery ? 'queryByRole' : 'getByRole';
  let regex;
  if (required) {
    regex = /^address_component\.address form_filler\.required_label$/i;
  } else if (optional) {
    regex = /^address_component\.address \(general\.optional\)$/i;
  } else {
    regex = /^address_component\.address$/i;
  }

  return getField({ method, regex });
};
const getZipCodeField = ({
  useQuery = false,
  optional = false,
  required = false,
} = {}) => {
  const method = useQuery ? 'queryByRole' : 'getByRole';
  let regex;
  if (required) {
    regex = /^address_component\.zip_code form_filler\.required_label$/i;
  } else if (optional) {
    regex = /^address_component\.zip_code \(general\.optional\)$/i;
  } else {
    regex = /^address_component\.zip_code$/i;
  }

  return getField({ method, regex });
};

const getGareOfField = ({
  useQuery = false,
  optional = false,
  required = false,
} = {}) => {
  const method = useQuery ? 'queryByRole' : 'getByRole';
  let regex;
  if (required) {
    regex = /^address_component\.care_of form_filler\.required_label$/i;
  } else if (optional) {
    regex = /^address_component\.care_of \(general\.optional\)$/i;
  } else {
    regex = /^address_component\.care_of$/i;
  }

  return getField({ method, regex });
};

const getHouseNumberField = ({
  useQuery = false,
  optional = false,
  required = false,
} = {}) => {
  const method = useQuery ? 'queryByRole' : 'getByRole';
  let regex;
  if (required) {
    regex = /^address_component\.house_number form_filler\.required_label$/i;
  } else if (optional) {
    regex = /^address_component\.house_number \(general\.optional\)$/i;
  } else {
    regex = /^address_component\.house_number$/i;
  }

  return getField({ method, regex });
};

const getPostPlaceField = () =>
  getField({ method: 'getByRole', regex: /^address_component\.post_place$/i });

describe('AddressComponent', () => {
  it('should return simplified version when simplified is true', () => {
    render({
      simplified: true,
    });

    expect(getAddressField()).toBeInTheDocument();
    expect(getZipCodeField()).toBeInTheDocument();
    expect(getPostPlaceField()).toBeInTheDocument();

    expect(getGareOfField({ useQuery: true })).not.toBeInTheDocument();
    expect(getHouseNumberField({ useQuery: true })).not.toBeInTheDocument();
  });

  it('should return complex version when simplified is false', () => {
    render({
      simplified: false,
    });

    expect(getAddressField()).toBeInTheDocument();
    expect(getZipCodeField()).toBeInTheDocument();
    expect(getPostPlaceField()).toBeInTheDocument();
    expect(getGareOfField()).toBeInTheDocument();
    expect(getHouseNumberField()).toBeInTheDocument();
  });

  it('should fire change event when user types into field, and field is blurred', async () => {
    const handleDataChange = jest.fn();

    render({
      formData: {
        address: '',
      },
      simplified: false,
      handleDataChange,
    });

    const address = getAddressField();
    await userEvent.type(address, 'Slottsplassen 1');
    fireEvent.blur(address);

    expect(handleDataChange).toHaveBeenCalledWith('Slottsplassen 1', {
      key: 'address',
    });
  });

  it('should not fire change event when readonly', async () => {
    const handleDataChange = jest.fn();

    render({
      formData: {
        address: 'initial address',
      },
      simplified: false,
      readOnly: true,
      handleDataChange,
    });

    const address = getAddressField();
    await userEvent.type(address, 'Slottsplassen 1');
    fireEvent.blur(address);

    expect(handleDataChange).not.toHaveBeenCalled();
  });

  it('should show error message on blur if zipcode is invalid, and not call handleDataChange', async () => {
    const handleDataChange = jest.fn();
    render({
      formData: {
        address: 'a',
      },
      required: true,
      simplified: false,
      handleDataChange,
    });

    const field = getZipCodeField({ required: true });
    await userEvent.type(field, '1');
    fireEvent.blur(field);

    const errorMessage = screen.getByText(
      /address_component\.validation_error_zipcode/i,
    );

    expect(handleDataChange).not.toHaveBeenCalled();
    expect(errorMessage).toBeInTheDocument();
  });

  it('should update postplace on mount', async () => {
    const handleDataChange = jest.fn();
    render({
      formData: {
        address: 'a',
        zipCode: '0001',
      },
      required: true,
      simplified: false,
      handleDataChange,
    });

    mockAxios.mockResponseFor(
      { url: 'https://api.bring.com/shippingguide/api/postalCode.json' },
      {
        data: {
          valid: true,
          result: 'OSLO',
        },
      },
    );

    await screen.findByDisplayValue('OSLO');

    expect(handleDataChange).toHaveBeenCalledWith('OSLO', { key: 'postPlace' });
  });

  it('should call change event when zipcode is valid', async () => {
    const handleDataChange = jest.fn();

    render({
      formData: {
        address: 'a',
        zipCode: '1',
        postPlace: '',
      },
      required: true,
      simplified: false,
      handleDataChange,
    });

    const field = getZipCodeField({ required: true });
    await userEvent.clear(field);
    await userEvent.type(field, '0001');
    fireEvent.blur(field);

    expect(handleDataChange).toHaveBeenCalledWith('0001', { key: 'zipCode' });
  });

  it('should call handleDataChange for post place when zip code is cleared', async () => {
    const handleDataChange = jest.fn();
    render({
      formData: {
        address: 'a',
        zipCode: '0001',
        postPlace: 'Oslo',
      },
      handleDataChange,
    });

    expect(screen.getByDisplayValue('0001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Oslo')).toBeInTheDocument();

    const field = getZipCodeField();
    await userEvent.clear(field);
    fireEvent.blur(field);

    expect(handleDataChange).toHaveBeenCalledWith('', { key: 'zipCode' });
    expect(handleDataChange).toHaveBeenCalledWith('', { key: 'postPlace' });
  });

  it('should display error message coming from props', () => {
    const errorMessage = 'cannot be empty;';
    const handleDataChange = jest.fn();
    render({
      formData: {
        address: '',
      },
      required: true,
      simplified: false,
      handleDataChange,
      componentValidations: {
        address: {
          errors: [errorMessage],
        },
      },
    });

    expect(screen.queryByText(errorMessage)).toBeInTheDocument();
  });

  it('should display no extra markings when required is false, and labelSettings.optionalIndicator is not true', () => {
    render({
      required: false,
      simplified: false,
    });
    expect(getAddressField()).toBeInTheDocument();
    expect(getZipCodeField()).toBeInTheDocument();
    expect(getPostPlaceField()).toBeInTheDocument();
    expect(getGareOfField()).toBeInTheDocument();
    expect(getHouseNumberField()).toBeInTheDocument();
  });

  it('should display required labels when required is true', () => {
    render({
      required: true,
      simplified: false,
    });

    expect(getAddressField({ required: true })).toBeInTheDocument();
    expect(getZipCodeField({ required: true })).toBeInTheDocument();
    expect(getGareOfField({ required: true })).toBeInTheDocument();
    expect(getHouseNumberField({ required: true })).toBeInTheDocument();
    expect(getPostPlaceField()).toBeInTheDocument();

    expect(
      getAddressField({ useQuery: true, optional: true }),
    ).not.toBeInTheDocument();
    expect(
      getZipCodeField({ useQuery: true, optional: true }),
    ).not.toBeInTheDocument();
    expect(
      getGareOfField({ useQuery: true, optional: true }),
    ).not.toBeInTheDocument();
    expect(
      getHouseNumberField({ useQuery: true, optional: true }),
    ).not.toBeInTheDocument();
  });

  it('should display optional labels when optionalIndicator is true', () => {
    render({
      simplified: false,
      labelSettings: {
        optionalIndicator: true,
      },
    });

    expect(getAddressField({ useQuery: true })).not.toBeInTheDocument();
    expect(getZipCodeField({ useQuery: true })).not.toBeInTheDocument();
    expect(getGareOfField({ useQuery: true })).not.toBeInTheDocument();
    expect(getHouseNumberField({ useQuery: true })).not.toBeInTheDocument();
    expect(getPostPlaceField()).toBeInTheDocument();

    expect(getAddressField({ optional: true })).toBeInTheDocument();
    expect(getZipCodeField({ optional: true })).toBeInTheDocument();
    expect(getGareOfField({ optional: true })).toBeInTheDocument();
    expect(getHouseNumberField({ optional: true })).toBeInTheDocument();
  });

  it('should not display optional labels by default', () => {
    render({
      simplified: false,
    });

    expect(
      getAddressField({ useQuery: true, optional: true }),
    ).not.toBeInTheDocument();
    expect(
      getZipCodeField({ useQuery: true, optional: true }),
    ).not.toBeInTheDocument();
    expect(
      getGareOfField({ useQuery: true, optional: true }),
    ).not.toBeInTheDocument();
    expect(
      getHouseNumberField({ useQuery: true, optional: true }),
    ).not.toBeInTheDocument();
    expect(getPostPlaceField()).toBeInTheDocument();

    expect(getAddressField()).toBeInTheDocument();
    expect(getZipCodeField()).toBeInTheDocument();
    expect(getGareOfField()).toBeInTheDocument();
    expect(getHouseNumberField()).toBeInTheDocument();
  });

  it('should not display optional labels when readonly is true', () => {
    render({
      readOnly: true,
      simplified: false,
    });

    expect(getAddressField()).toBeInTheDocument();
    expect(getZipCodeField()).toBeInTheDocument();
    expect(getGareOfField()).toBeInTheDocument();
    expect(getHouseNumberField()).toBeInTheDocument();
    expect(getPostPlaceField()).toBeInTheDocument();

    expect(
      getAddressField({ useQuery: true, optional: true }),
    ).not.toBeInTheDocument();
    expect(
      getZipCodeField({ useQuery: true, optional: true }),
    ).not.toBeInTheDocument();
    expect(
      getGareOfField({ useQuery: true, optional: true }),
    ).not.toBeInTheDocument();
    expect(
      getHouseNumberField({ useQuery: true, optional: true }),
    ).not.toBeInTheDocument();
  });

  it('should not display optional labels when readonly is true, even when optionalIndicator is true', () => {
    render({
      readOnly: true,
      simplified: false,
      labelSettings: {
        optionalIndicator: true,
      },
    });

    expect(getAddressField()).toBeInTheDocument();
    expect(getZipCodeField()).toBeInTheDocument();
    expect(getGareOfField()).toBeInTheDocument();
    expect(getHouseNumberField()).toBeInTheDocument();
    expect(getPostPlaceField()).toBeInTheDocument();

    expect(
      getAddressField({ useQuery: true, optional: true }),
    ).not.toBeInTheDocument();
    expect(
      getZipCodeField({ useQuery: true, optional: true }),
    ).not.toBeInTheDocument();
    expect(
      getGareOfField({ useQuery: true, optional: true }),
    ).not.toBeInTheDocument();
    expect(
      getHouseNumberField({ useQuery: true, optional: true }),
    ).not.toBeInTheDocument();
  });

  it('should not display optional labels when required is true, even when optionalIndicator is true', () => {
    render({
      required: true,
      simplified: false,
      labelSettings: {
        optionalIndicator: true,
      },
    });

    expect(getAddressField({ required: true })).toBeInTheDocument();
    expect(getZipCodeField({ required: true })).toBeInTheDocument();
    expect(getGareOfField({ required: true })).toBeInTheDocument();
    expect(getHouseNumberField({ required: true })).toBeInTheDocument();
    expect(getPostPlaceField()).toBeInTheDocument();

    expect(
      getAddressField({ useQuery: true, optional: true }),
    ).not.toBeInTheDocument();
    expect(
      getZipCodeField({ useQuery: true, optional: true }),
    ).not.toBeInTheDocument();
    expect(
      getGareOfField({ useQuery: true, optional: true }),
    ).not.toBeInTheDocument();
    expect(
      getHouseNumberField({ useQuery: true, optional: true }),
    ).not.toBeInTheDocument();
  });
});
