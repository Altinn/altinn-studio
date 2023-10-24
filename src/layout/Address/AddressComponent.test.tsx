import React from 'react';

import { act, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import mockAxios from 'jest-mock-axios';

import { AddressComponent } from 'src/layout/Address/AddressComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const render = ({ component, genericProps }: Partial<RenderGenericComponentTestProps<'AddressComponent'>> = {}) => {
  renderGenericComponentTest({
    type: 'AddressComponent',
    renderer: (props) => <AddressComponent {...props} />,
    component: {
      simplified: true,
      readOnly: false,
      required: false,
      textResourceBindings: {},
      ...component,
    },
    genericProps: {
      formData: {
        address: 'adresse 1',
      },
      isValid: true,
      ...genericProps,
    },
  });
};

const getField = ({ method, regex }) =>
  screen[method]('textbox', {
    name: regex,
  });

const getAddressField = ({ useQuery = false, optional = false, required = false } = {}) => {
  const method = useQuery ? 'queryByRole' : 'getByRole';
  let regex;
  if (required) {
    regex = /^Gateadresse \*$/i;
  } else if (optional) {
    regex = /^Gateadresse \(Valgfri\)$/i;
  } else {
    regex = /^Gateadresse$/i;
  }

  return getField({ method, regex });
};
const getZipCodeField = ({ useQuery = false, optional = false, required = false } = {}) => {
  const method = useQuery ? 'queryByRole' : 'getByRole';
  let regex;
  if (required) {
    regex = /^Postnr \*$/i;
  } else if (optional) {
    regex = /^Postnr \(Valgfri\)$/i;
  } else {
    regex = /^Postnr$/i;
  }

  return getField({ method, regex });
};

const getGareOfField = ({ useQuery = false, optional = false, required = false } = {}) => {
  const method = useQuery ? 'queryByRole' : 'getByRole';
  let regex;
  if (required) {
    regex = /^C\/O eller annen tilleggsadresse \*$/i;
  } else if (optional) {
    regex = /^C\/O eller annen tilleggsadresse \(Valgfri\)$/i;
  } else {
    regex = /^C\/O eller annen tilleggsadresse$/i;
  }

  return getField({ method, regex });
};

const getHouseNumberField = ({ useQuery = false, optional = false, required = false } = {}) => {
  const method = useQuery ? 'queryByRole' : 'getByRole';
  let regex;
  if (required) {
    regex = /^Bolignummer \*$/i;
  } else if (optional) {
    regex = /^Bolignummer \(Valgfri\)$/i;
  } else {
    regex = /^Bolignummer$/i;
  }

  return getField({ method, regex });
};

const getPostPlaceField = () => getField({ method: 'getByRole', regex: /^Poststed$/i });

describe('AddressComponent', () => {
  jest.useFakeTimers();
  const user = userEvent.setup({
    advanceTimers: (time) => {
      act(() => {
        jest.advanceTimersByTime(time);
      });
    },
  });

  it('should return simplified version when simplified is true', () => {
    render({
      component: {
        simplified: true,
      },
    });

    expect(getAddressField()).toBeInTheDocument();
    expect(getZipCodeField()).toBeInTheDocument();
    expect(getPostPlaceField()).toBeInTheDocument();

    expect(getGareOfField({ useQuery: true })).not.toBeInTheDocument();
    expect(getHouseNumberField({ useQuery: true })).not.toBeInTheDocument();
  });

  it('should return complex version when simplified is false', () => {
    render({
      component: {
        simplified: false,
      },
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
      component: {
        simplified: false,
      },
      genericProps: {
        formData: {
          address: '',
        },
        handleDataChange,
      },
    });

    const address = getAddressField();
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      await user.type(address, 'Slottsplassen 1');
      await user.tab();
    });

    expect(handleDataChange).toHaveBeenCalledWith('Slottsplassen 1', {
      key: 'address',
    });
  });

  it('should not fire change event when readonly', async () => {
    const handleDataChange = jest.fn();

    render({
      genericProps: {
        formData: {
          address: 'initial address',
        },
        handleDataChange,
      },
      component: {
        simplified: false,
        readOnly: true,
      },
    });

    const address = getAddressField();

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      await user.type(address, 'Slottsplassen 1');
      await user.tab();
    });

    expect(handleDataChange).not.toHaveBeenCalled();
  });

  it('should show error message on blur if zipcode is invalid, and not call handleDataChange', async () => {
    const handleDataChange = jest.fn();
    render({
      component: {
        required: true,
        simplified: false,
      },
      genericProps: {
        formData: {
          address: 'a',
        },
        handleDataChange,
      },
    });

    const field = getZipCodeField({ required: true });

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      await user.type(field, '1');
      await user.tab();
    });

    const errorMessage = screen.getByText(/Postnummer er ugyldig\. Et postnummer består kun av 4 siffer\./i);

    expect(handleDataChange).not.toHaveBeenCalled();
    expect(errorMessage).toBeInTheDocument();
  });

  it('should update postplace on mount', async () => {
    const handleDataChange = jest.fn();
    render({
      component: {
        required: true,
        simplified: false,
      },
      genericProps: {
        formData: {
          address: 'a',
          zipCode: '0001',
        },
        handleDataChange,
      },
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
      genericProps: {
        formData: {
          address: 'a',
          zipCode: '1',
          postPlace: '',
        },
        handleDataChange,
      },
      component: {
        required: true,
        simplified: false,
      },
    });

    const field = getZipCodeField({ required: true });
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      await user.clear(field);
      await user.type(field, '0001');
      await user.tab();
    });

    expect(handleDataChange).toHaveBeenCalledWith('0001', { key: 'zipCode' });
  });

  it('should call handleDataChange for post place when zip code is cleared', async () => {
    const handleDataChange = jest.fn();
    render({
      genericProps: {
        formData: {
          address: 'a',
          zipCode: '0001',
          postPlace: 'Oslo',
        },
        handleDataChange,
      },
    });

    expect(screen.getByDisplayValue('0001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Oslo')).toBeInTheDocument();

    const field = getZipCodeField();

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      await user.clear(field);
      await user.tab();
    });

    expect(handleDataChange).toHaveBeenCalledWith('', { key: 'zipCode' });
    expect(handleDataChange).toHaveBeenCalledWith('', { key: 'postPlace' });
  });

  it('should display error message coming from props', () => {
    const errorMessage = 'cannot be empty;';
    const handleDataChange = jest.fn();
    render({
      genericProps: {
        formData: {
          address: '',
        },
        handleDataChange,
        componentValidations: {
          address: {
            errors: [errorMessage],
          },
        },
      },
      component: {
        required: true,
        simplified: false,
      },
    });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should display no extra markings when required is false, and labelSettings.optionalIndicator is not true', () => {
    render({
      component: {
        required: false,
        simplified: false,
      },
    });
    expect(getAddressField()).toBeInTheDocument();
    expect(getZipCodeField()).toBeInTheDocument();
    expect(getPostPlaceField()).toBeInTheDocument();
    expect(getGareOfField()).toBeInTheDocument();
    expect(getHouseNumberField()).toBeInTheDocument();
  });

  it('should display required labels when required is true', () => {
    render({
      component: {
        required: true,
        simplified: false,
      },
    });

    expect(getAddressField({ required: true })).toBeInTheDocument();
    expect(getZipCodeField({ required: true })).toBeInTheDocument();
    expect(getGareOfField({ required: true })).toBeInTheDocument();
    expect(getHouseNumberField({ required: true })).toBeInTheDocument();
    expect(getPostPlaceField()).toBeInTheDocument();

    expect(getAddressField({ useQuery: true, optional: true })).not.toBeInTheDocument();
    expect(getZipCodeField({ useQuery: true, optional: true })).not.toBeInTheDocument();
    expect(getGareOfField({ useQuery: true, optional: true })).not.toBeInTheDocument();
    expect(getHouseNumberField({ useQuery: true, optional: true })).not.toBeInTheDocument();
  });

  it('should display optional labels when optionalIndicator is true', () => {
    render({
      component: {
        simplified: false,
        labelSettings: {
          optionalIndicator: true,
        },
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
      component: {
        simplified: false,
      },
    });

    expect(getAddressField({ useQuery: true, optional: true })).not.toBeInTheDocument();
    expect(getZipCodeField({ useQuery: true, optional: true })).not.toBeInTheDocument();
    expect(getGareOfField({ useQuery: true, optional: true })).not.toBeInTheDocument();
    expect(getHouseNumberField({ useQuery: true, optional: true })).not.toBeInTheDocument();
    expect(getPostPlaceField()).toBeInTheDocument();

    expect(getAddressField()).toBeInTheDocument();
    expect(getZipCodeField()).toBeInTheDocument();
    expect(getGareOfField()).toBeInTheDocument();
    expect(getHouseNumberField()).toBeInTheDocument();
  });

  it('should not display optional labels when readonly is true', () => {
    render({
      component: {
        readOnly: true,
        simplified: false,
      },
    });

    expect(getAddressField()).toBeInTheDocument();
    expect(getZipCodeField()).toBeInTheDocument();
    expect(getGareOfField()).toBeInTheDocument();
    expect(getHouseNumberField()).toBeInTheDocument();
    expect(getPostPlaceField()).toBeInTheDocument();

    expect(getAddressField({ useQuery: true, optional: true })).not.toBeInTheDocument();
    expect(getZipCodeField({ useQuery: true, optional: true })).not.toBeInTheDocument();
    expect(getGareOfField({ useQuery: true, optional: true })).not.toBeInTheDocument();
    expect(getHouseNumberField({ useQuery: true, optional: true })).not.toBeInTheDocument();
  });

  it('should not display optional labels when readonly is true, even when optionalIndicator is true', () => {
    render({
      component: {
        readOnly: true,
        simplified: false,
        labelSettings: {
          optionalIndicator: true,
        },
      },
    });

    expect(getAddressField()).toBeInTheDocument();
    expect(getZipCodeField()).toBeInTheDocument();
    expect(getGareOfField()).toBeInTheDocument();
    expect(getHouseNumberField()).toBeInTheDocument();
    expect(getPostPlaceField()).toBeInTheDocument();

    expect(getAddressField({ useQuery: true, optional: true })).not.toBeInTheDocument();
    expect(getZipCodeField({ useQuery: true, optional: true })).not.toBeInTheDocument();
    expect(getGareOfField({ useQuery: true, optional: true })).not.toBeInTheDocument();
    expect(getHouseNumberField({ useQuery: true, optional: true })).not.toBeInTheDocument();
  });

  it('should not display optional labels when required is true, even when optionalIndicator is true', () => {
    render({
      component: {
        required: true,
        simplified: false,
      },
    });

    expect(getAddressField({ required: true })).toBeInTheDocument();
    expect(getZipCodeField({ required: true })).toBeInTheDocument();
    expect(getGareOfField({ required: true })).toBeInTheDocument();
    expect(getHouseNumberField({ required: true })).toBeInTheDocument();
    expect(getPostPlaceField()).toBeInTheDocument();

    expect(getAddressField({ useQuery: true, optional: true })).not.toBeInTheDocument();
    expect(getZipCodeField({ useQuery: true, optional: true })).not.toBeInTheDocument();
    expect(getGareOfField({ useQuery: true, optional: true })).not.toBeInTheDocument();
    expect(getHouseNumberField({ useQuery: true, optional: true })).not.toBeInTheDocument();
  });
});
