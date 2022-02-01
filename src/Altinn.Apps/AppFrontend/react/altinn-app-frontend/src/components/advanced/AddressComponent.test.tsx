import * as React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { IComponentProps } from 'src/components';
import { AddressComponent } from './AddressComponent';
import type { IAddressComponentProps } from './AddressComponent';

import { setupServer, handlers } from '../../../testUtils';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const render = (props: Partial<IAddressComponentProps> = {}) => {
  const allProps: IAddressComponentProps = {
    id: 'id',
    formData: {
      address: 'adresse 1',
    },
    handleDataChange: () => '',
    getTextResource: () => 'test',
    isValid: true,
    simplified: true,
    dataModelBindings: {},
    componentValidations: {
      zipCode: null,
      houseNumber: null,
    },
    readOnly: false,
    required: false,
    language: {
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
    },
    textResourceBindings: {},
    ...({} as IComponentProps),
    ...props,
  };

  rtlRender(<AddressComponent {...allProps} />);
};

const getField = ({ method, regex }) =>
  screen[method]('textbox', {
    name: regex,
  });

const getAddressField = ({ useQuery = false, optional = false } = {}) => {
  const method = useQuery ? 'queryByRole' : 'getByRole';
  const regex = optional
    ? /^address_component\.address \(general\.optional\)$/i
    : /^address_component\.address$/i;

  return getField({ method, regex });
};
const getZipCodeField = ({ useQuery = false, optional = false } = {}) => {
  const method = useQuery ? 'queryByRole' : 'getByRole';
  const regex = optional
    ? /^address_component\.zip_code \(general\.optional\)$/i
    : /^address_component\.zip_code$/i;

  return getField({ method, regex });
};

const getGareOfField = ({ useQuery = false, optional = false } = {}) => {
  const method = useQuery ? 'queryByRole' : 'getByRole';
  const regex = optional
    ? /^address_component\.care_of \(general\.optional\)$/i
    : /^address_component\.care_of$/i;

  return getField({ method, regex });
};

const getHouseNumberField = ({ useQuery = false, optional = false } = {}) => {
  const method = useQuery ? 'queryByRole' : 'getByRole';
  const regex = optional
    ? /^address_component\.house_number \(general\.optional\)$/i
    : /^address_component\.house_number$/i;

  return getField({ method, regex });
};

const getPostPlaceField = () =>
  getField({ method: 'getByRole', regex: /^address_component\.post_place$/i });

describe('components > advanced > AddressComponent', () => {
  it('should return simplified version when simplified is true', () => {
    render();

    expect(getAddressField({ optional: true })).toBeInTheDocument();
    expect(getZipCodeField({ optional: true })).toBeInTheDocument();
    expect(getPostPlaceField()).toBeInTheDocument();

    expect(getGareOfField({ useQuery: true })).not.toBeInTheDocument();
    expect(getHouseNumberField({ useQuery: true })).not.toBeInTheDocument();
    expect(
      getGareOfField({ optional: true, useQuery: true }),
    ).not.toBeInTheDocument();
    expect(
      getHouseNumberField({ optional: true, useQuery: true }),
    ).not.toBeInTheDocument();
  });

  it('should return complex version when simplified is false', () => {
    render({
      simplified: false,
    });

    expect(getAddressField({ optional: true })).toBeInTheDocument();
    expect(getZipCodeField({ optional: true })).toBeInTheDocument();
    expect(getPostPlaceField()).toBeInTheDocument();
    expect(getGareOfField({ optional: true })).toBeInTheDocument();
    expect(getHouseNumberField({ optional: true })).toBeInTheDocument();
  });

  it('should fire change event when user types into field, and field is blurred', () => {
    const handleDataChange = jest.fn();

    render({
      formData: {
        address: '',
      },
      simplified: false,
      handleDataChange,
    });

    const address = getAddressField({ optional: true });
    userEvent.type(address, 'Slottsplassen 1');
    fireEvent.blur(address);

    expect(handleDataChange).toHaveBeenCalledWith('Slottsplassen 1', 'address');
  });

  it('should fire change event, with initial content, when readonly and field is blurred', () => {
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
    userEvent.type(address, 'Slottsplassen 1');
    fireEvent.blur(address);

    expect(handleDataChange).not.toHaveBeenCalledWith(
      'Slottsplassen 1',
      'address',
    );
    expect(handleDataChange).toHaveBeenCalledWith('initial address', 'address');
  });

  it('should show error message on blur if zipcode is invalid, and not call handleDataChange', () => {
    const handleDataChange = jest.fn();
    render({
      formData: {
        address: 'a',
      },
      required: true,
      simplified: false,
      handleDataChange,
    });

    const field = getZipCodeField();
    userEvent.type(field, '1');
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

    await screen.findByDisplayValue('OSLO');

    expect(handleDataChange).toHaveBeenCalledWith('OSLO', 'postPlace');
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

    const field = getZipCodeField();
    userEvent.clear(field);
    userEvent.type(field, '0001');
    fireEvent.blur(field);

    expect(handleDataChange).toHaveBeenCalledWith('0001', 'zipCode');
  });

  it('should call handleDataChange for post place when zip code is cleared', () => {
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

    const field = getZipCodeField({ optional: true });
    userEvent.clear(field);
    fireEvent.blur(field);

    expect(handleDataChange).toHaveBeenCalledWith('', 'zipCode');
    expect(handleDataChange).toHaveBeenCalledWith('', 'postPlace');
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

  it('should display optional labels when required is false, and labelSettings.optionalIndicator is not false', () => {
    render({
      required: false,
      simplified: false,
    });
    expect(getAddressField({ optional: true })).toBeInTheDocument();
    expect(getZipCodeField({ optional: true })).toBeInTheDocument();
    expect(getPostPlaceField()).toBeInTheDocument();
    expect(getGareOfField({ optional: true })).toBeInTheDocument();
    expect(getHouseNumberField({ optional: true })).toBeInTheDocument();
  });

  it('should not display optional labels when required is true', () => {
    render({
      required: true,
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

  it('should not display optional labels when optionalIndicator is false', () => {
    render({
      simplified: false,
      labelSettings: {
        optionalIndicator: false,
      },
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
});
