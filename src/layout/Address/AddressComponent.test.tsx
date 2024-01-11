import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { AddressComponent } from 'src/layout/Address/AddressComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const render = async ({
  component,
  genericProps,
  ...rest
}: Partial<RenderGenericComponentTestProps<'AddressComponent'>> = {}) =>
  await renderGenericComponentTest({
    type: 'AddressComponent',
    renderer: (props) => <AddressComponent {...props} />,
    component: {
      simplified: true,
      readOnly: false,
      required: false,
      textResourceBindings: {},
      dataModelBindings: {
        address: 'address',
        zipCode: 'zipCode',
        postPlace: 'postPlace',
        careOf: 'careOf',
        houseNumber: 'houseNumber',
      },
      ...component,
    },
    genericProps: {
      isValid: true,
      ...genericProps,
    },
    queries: {
      fetchPostPlace: () => Promise.resolve({ valid: true, result: 'OSLO' }),
      ...rest.queries,
    },
    ...rest,
  });

describe('AddressComponent', () => {
  it('should return simplified version when simplified is true', async () => {
    await render({
      component: {
        simplified: true,
      },
    });

    expect(screen.getByRole('textbox', { name: 'Gateadresse' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Postnr' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Poststed' })).toBeInTheDocument();

    expect(screen.queryByRole('textbox', { name: 'C/O eller annen tilleggsadresse' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Bolignummer' })).not.toBeInTheDocument();
  });

  it('should return complex version when simplified is false', async () => {
    await render({
      component: {
        simplified: false,
      },
    });

    expect(screen.getByRole('textbox', { name: 'Gateadresse' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Postnr' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Poststed' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'C/O eller annen tilleggsadresse' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Bolignummer' })).toBeInTheDocument();
  });

  it('should fire change event when user types into field, and field is blurred', async () => {
    const { formDataMethods } = await render({
      component: {
        simplified: false,
      },
    });

    const address = screen.getByRole('textbox', { name: 'Gateadresse' });
    await userEvent.type(address, 'Slottsplassen 1');
    await userEvent.tab();

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      path: 'address',
      newValue: 'Slottsplassen 1',
    });
  });

  it('should not fire change event when readonly', async () => {
    const { formDataMethods } = await render({
      component: {
        simplified: false,
        readOnly: true,
      },
    });

    const address = screen.getByRole('textbox', { name: 'Gateadresse' });

    await userEvent.type(address, 'Slottsplassen 1');
    await userEvent.tab();

    expect(formDataMethods.setLeafValue).not.toHaveBeenCalled();
  });

  it('should show error message on blur if zipcode is invalid', async () => {
    await render({
      component: {
        showValidations: ['Component'],
        required: true,
        simplified: true,
      },
      queries: {
        fetchFormData: async () => ({ address: 'initial address', zipCode: '0001' }),
        fetchPostPlace: (zipCode: string) =>
          zipCode === '0001'
            ? Promise.resolve({ valid: true, result: 'OSLO' })
            : Promise.resolve({ valid: false, result: '' }),
      },
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox', { name: 'Postnr *' }), '1');
    await userEvent.tab();

    expect(screen.getByRole('alert')).toHaveTextContent('Postnummer er ugyldig. Et postnummer består kun av 4 siffer.');
  });

  it('should update postplace on mount', async () => {
    const { formDataMethods } = await render({
      component: {
        required: true,
        simplified: false,
      },
      queries: {
        fetchFormData: async () => ({ address: 'initial address', zipCode: '0001' }),
      },
    });

    await screen.findByDisplayValue('OSLO');

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      path: 'postPlace',
      newValue: 'OSLO',
    });
  });

  it('should call change event when zipcode is valid', async () => {
    const { formDataMethods } = await render({
      component: {
        required: true,
        simplified: false,
      },
    });

    const field = screen.getByRole('textbox', { name: 'Postnr *' });
    await userEvent.clear(field);
    await userEvent.type(field, '0001');
    await userEvent.tab();

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      path: 'zipCode',
      newValue: '0001',
    });
  });

  it('should call dispatch for post place when zip code is cleared', async () => {
    const { formDataMethods } = await render({
      queries: {
        fetchFormData: async () => ({ address: 'a', zipCode: '0001', postPlace: 'Oslo' }),
      },
    });

    expect(screen.getByDisplayValue('0001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('OSLO')).toBeInTheDocument();

    await userEvent.clear(screen.getByRole('textbox', { name: 'Postnr' }));
    await userEvent.tab();

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      path: 'zipCode',
      newValue: '',
    });
    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      path: 'postPlace',
      newValue: '',
    });
  });

  it('should display no extra markings when required is false, and labelSettings.optionalIndicator is not true', async () => {
    await render({
      component: {
        required: false,
        simplified: false,
      },
    });
    expect(screen.getByRole('textbox', { name: 'Gateadresse' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Postnr' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Poststed' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'C/O eller annen tilleggsadresse' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Bolignummer' })).toBeInTheDocument();
  });

  it('should display required labels when required is true', async () => {
    await render({
      component: {
        required: true,
        simplified: false,
      },
    });

    expect(screen.getByRole('textbox', { name: 'Gateadresse *' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Postnr *' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'C/O eller annen tilleggsadresse *' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Bolignummer *' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Poststed' })).toBeInTheDocument();

    expect(screen.queryByRole('textbox', { name: 'Gateadresse (Valgfri)' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Postnr (Valgfri)' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: 'C/O eller annen tilleggsadresse (Valgfri)' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Bolignummer (Valgfri)' })).not.toBeInTheDocument();
  });

  it('should display optional labels when optionalIndicator is true', async () => {
    await render({
      component: {
        simplified: false,
        labelSettings: {
          optionalIndicator: true,
        },
      },
    });

    expect(screen.queryByRole('textbox', { name: 'Gateadresse' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Postnr' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'C/O eller annen tilleggsadresse' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Bolignummer' })).not.toBeInTheDocument();

    expect(screen.getByRole('textbox', { name: 'Poststed' })).toBeInTheDocument();

    expect(screen.getByRole('textbox', { name: 'Gateadresse (Valgfri)' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Postnr (Valgfri)' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'C/O eller annen tilleggsadresse (Valgfri)' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Bolignummer (Valgfri)' })).toBeInTheDocument();
  });

  it('should not display optional labels by default', async () => {
    await render({
      component: {
        simplified: false,
      },
    });

    expect(screen.queryByRole('textbox', { name: 'Gateadresse (Valgfri)' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Postnr (Valgfri)' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: 'C/O eller annen tilleggsadresse (Valgfri)' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Bolignummer (Valgfri)' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Poststed' })).toBeInTheDocument();

    expect(screen.getByRole('textbox', { name: 'Gateadresse' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Postnr' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'C/O eller annen tilleggsadresse' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Bolignummer' })).toBeInTheDocument();
  });

  it('should not display optional labels when readonly is true', async () => {
    await render({
      component: {
        readOnly: true,
        simplified: false,
      },
    });

    expect(screen.getByRole('textbox', { name: 'Gateadresse' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Postnr' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'C/O eller annen tilleggsadresse' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Bolignummer' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Poststed' })).toBeInTheDocument();

    expect(screen.queryByRole('textbox', { name: 'Gateadresse (Valgfri)' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Postnr (Valgfri)' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: 'C/O eller annen tilleggsadresse (Valgfri)' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Bolignummer (Valgfri)' })).not.toBeInTheDocument();
  });

  it('should not display optional labels when readonly is true, even when optionalIndicator is true', async () => {
    await render({
      component: {
        readOnly: true,
        simplified: false,
        labelSettings: {
          optionalIndicator: true,
        },
      },
    });

    expect(screen.getByRole('textbox', { name: 'Gateadresse' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Postnr' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'C/O eller annen tilleggsadresse' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Bolignummer' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Poststed' })).toBeInTheDocument();

    expect(screen.queryByRole('textbox', { name: 'Gateadresse (Valgfri)' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Postnr (Valgfri)' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: 'C/O eller annen tilleggsadresse (Valgfri)' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Bolignummer (Valgfri)' })).not.toBeInTheDocument();
  });

  it('should not display optional labels when required is true, even when optionalIndicator is true', async () => {
    await render({
      component: {
        required: true,
        simplified: false,
      },
    });

    expect(screen.getByRole('textbox', { name: 'Gateadresse *' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Postnr *' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'C/O eller annen tilleggsadresse *' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Bolignummer *' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Poststed' })).toBeInTheDocument();

    expect(screen.queryByRole('textbox', { name: 'Gateadresse (Valgfri)' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Postnr (Valgfri)' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: 'C/O eller annen tilleggsadresse (Valgfri)' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Bolignummer (Valgfri)' })).not.toBeInTheDocument();
  });
});
