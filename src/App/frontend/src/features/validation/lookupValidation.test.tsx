import React from 'react';

import { act, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { AxiosHeaders } from 'axios';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultMockDataElementId, getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { Form } from 'src/components/form/Form';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { BackendValidationSeverity } from 'src/features/validation';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import { httpGet, httpPost } from 'src/utils/network/networking';
import type { CompExternalExact } from 'src/layout/layout';

vi.mock('src/utils/network/networking', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/utils/network/networking')>()),
  httpGet: vi.fn(),
  httpPost: vi.fn(),
}));

function axiosResponse(data: unknown) {
  return { data, status: 200, statusText: 'OK', headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() } };
}

const lookups = [
  {
    type: 'PersonLookup',
    bindings: ['ssn', 'fullName', 'firstName', 'middleName', 'lastName'],
    requiredMessage: 'Du må fylle ut fødselsnummer',
    number: '08829698278',
    numberLabel: /Fødselsnummer/i,
  },
  {
    type: 'OrganizationLookup',
    bindings: ['orgnr', 'name'],
    requiredMessage: 'Du må fylle ut organisasjonsnummer og hente opplysninger',
    number: '043871668',
    numberLabel: /Organisasjonsnummer/i,
  },
] as const;

describe.each(lookups)('$type validation', ({ type, bindings, requiredMessage, number, numberLabel }) => {
  async function render({
    repeating = false,
    backend = false,
    required = true,
    showValidations = backend,
    dynamicRequired = false,
  } = {}) {
    const prefix = repeating ? 'lookups.' : '';
    const lookup = {
      id: 'lookup',
      type,
      required: dynamicRequired ? ['equals', ['dataModel', 'LookupRequired', defaultDataTypeMock], 'yes'] : required,
      showValidations: showValidations ? ['All'] : [],
      dataModelBindings: Object.fromEntries(
        bindings.map((binding) => [binding, { dataType: defaultDataTypeMock, field: `${prefix}${binding}` }]),
      ),
      textResourceBindings: { title: 'Lookup' },
    } as CompExternalExact<'PersonLookup' | 'OrganizationLookup'>;

    return renderWithInstanceAndLayout({
      renderer: () => <Form />,
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((bootstrap) => {
            bootstrap.layouts.FormLayout.data.layout = repeating
              ? [
                  {
                    id: 'group',
                    type: 'RepeatingGroup',
                    children: ['lookup'],
                    dataModelBindings: { group: { dataType: defaultDataTypeMock, field: 'lookups' } },
                    validateOnSaveRow: ['All'],
                  },
                  lookup,
                ]
              : [lookup];
            const fields = Object.fromEntries(bindings.map((binding) => [binding, '']));
            bootstrap.dataModels[defaultDataTypeMock].initialData = repeating
              ? {
                  LookupRequired: 'yes',
                  lookups: [
                    { [ALTINN_ROW_ID]: 'row-0', ...fields },
                    { [ALTINN_ROW_ID]: 'row-1', ...fields },
                  ],
                }
              : { ...fields, LookupRequired: 'yes' };
            bootstrap.dataModels[defaultDataTypeMock].initialValidationIssues = backend
              ? bindings.map((binding) => ({
                  field: repeating ? `lookups[0].${binding}` : binding,
                  dataElementId: defaultMockDataElementId,
                  source: 'Custom',
                  severity: BackendValidationSeverity.Error,
                  customTextKey: `Invalid ${binding}`,
                }))
              : [];
          }),
      },
    });
  }

  beforeEach(() => {
    vi.mocked(httpGet).mockReset();
    vi.mocked(httpPost).mockReset();
  });

  async function fillLookup() {
    await userEvent.type(screen.getByRole('textbox', { name: numberLabel }), number);
    if (type === 'PersonLookup') {
      await userEvent.type(screen.getByRole('textbox', { name: /Etternavn/i }), 'Forelder');
    }
  }

  it('validates temporary inputs even with showValidations disabled and an optional result', async () => {
    await render({ required: false });
    await userEvent.click(screen.getByRole('button', { name: /Hent opplysninger/i }));
    expect(screen.getByRole('textbox', { name: numberLabel })).toHaveAttribute('aria-invalid', 'true');
    expect(httpGet).not.toHaveBeenCalled();
    expect(httpPost).not.toHaveBeenCalled();
    if (type === 'PersonLookup') {
      expect(screen.getByText('Etternavn kan ikke være tomt.')).toBeInTheDocument();
    }
  });

  it('publishes failed lookups so row validation prevents saving an optional lookup', async () => {
    vi.mocked(httpGet).mockResolvedValue({ success: false, organisationDetails: null });
    vi.mocked(httpPost).mockResolvedValue(axiosResponse({ success: false, personDetails: null }));
    await render({ repeating: true, required: false });
    await userEvent.click(screen.getAllByRole('button', { name: /Rediger/i })[0]);
    await fillLookup();
    await userEvent.click(screen.getByRole('button', { name: /Hent opplysninger/i }));
    const row = screen.getByTestId('group-edit-container');
    await waitFor(() => expect(row.querySelector('[data-field="validation"]')).toBeInTheDocument());
    await userEvent.click(within(row).getByRole('button', { name: /Lagre og lukk/i }));
    expect(screen.getByTestId('group-edit-container')).toBeInTheDocument();
    expect(within(row).getByRole('textbox', { name: numberLabel })).toHaveValue(number);
  });

  it('reveals custom backend errors after saving a successful lookup without configuration', async () => {
    const fields =
      type === 'PersonLookup'
        ? { ssn: number, fullName: 'Rik Forelder', firstName: 'Rik', middleName: '', lastName: 'Forelder' }
        : { orgnr: number, name: 'Skog og Fjell Consulting' };
    vi.mocked(httpGet).mockResolvedValue({
      success: true,
      organisationDetails: { orgNr: number, name: 'Skog og Fjell Consulting' },
    });
    vi.mocked(httpPost).mockResolvedValue(
      axiosResponse({ success: true, personDetails: { ...fields, name: 'Rik Forelder' } }),
    );
    const { mutations } = await render({ showValidations: false });
    await fillLookup();
    await userEvent.click(screen.getByRole('button', { name: /Hent opplysninger/i }));
    await waitFor(() => expect(mutations.doPatchMultipleFormData.mock).toHaveBeenCalled());
    mutations.doPatchMultipleFormData.resolve({
      data: {
        newDataModels: [{ dataElementId: defaultMockDataElementId, data: fields }],
        validationIssues: [
          {
            source: 'Custom',
            issues: bindings.map((binding) => ({
              source: 'Custom',
              field: binding,
              dataElementId: defaultMockDataElementId,
              severity: BackendValidationSeverity.Error,
              customTextKey: `Invalid ${binding}`,
            })),
          },
        ],
        instance: getInstanceDataMock(),
      },
    });
    for (const binding of bindings) {
      await waitFor(() => expect(screen.getByText(`Invalid ${binding}`)).toBeInTheDocument());
    }
    expect(screen.getByRole('textbox', { name: numberLabel })).toHaveAttribute('aria-invalid', 'true');
    // Enter in the fetched, read-only field must not look up the discarded temporary inputs again.
    await userEvent.type(screen.getByRole('textbox', { name: numberLabel }), '{Enter}');
    expect(type === 'PersonLookup' ? httpPost : httpGet).toHaveBeenCalledTimes(1);
  });

  it('shows required validation inside the edited row when saving is blocked', async () => {
    await render({ repeating: true });
    await userEvent.click(screen.getAllByRole('button', { name: /Rediger/i })[0]);
    const row = screen.getByTestId('group-edit-container');
    expect(within(row).queryByText(requiredMessage)).not.toBeInTheDocument();
    await userEvent.click(within(row).getByRole('button', { name: /Lagre og lukk/i }));
    await waitFor(() => expect(within(row).getByText(requiredMessage)).toBeInTheDocument());
    expect(screen.getByTestId('group-edit-container')).toBeInTheDocument();
  });

  it('allows saving an empty optional lookup row', async () => {
    await render({ repeating: true, required: false });
    await userEvent.click(screen.getAllByRole('button', { name: /Rediger/i })[0]);
    await userEvent.click(
      within(screen.getByTestId('group-edit-container')).getByRole('button', { name: /Lagre og lukk/i }),
    );
    await waitFor(() => expect(screen.queryByTestId('group-edit-container')).not.toBeInTheDocument());
  });

  it('updates required validation inside a row when its expression changes', async () => {
    const { formDataMethods, mutations } = await render({ repeating: true, dynamicRequired: true });
    await userEvent.click(screen.getAllByRole('button', { name: /Rediger/i })[0]);
    const row = screen.getByTestId('group-edit-container');
    await userEvent.click(within(row).getByRole('button', { name: /Lagre og lukk/i }));
    await waitFor(() => expect(within(row).getByText(requiredMessage)).toBeInTheDocument());
    act(() =>
      formDataMethods.setLeafValue({
        reference: { dataType: defaultDataTypeMock, field: 'LookupRequired' },
        newValue: 'no',
      }),
    );
    await waitFor(() => expect(mutations.doPatchMultipleFormData.mock).toHaveBeenCalled());
    mutations.doPatchMultipleFormData.resolve({
      data: { newDataModels: [], validationIssues: [], instance: getInstanceDataMock() },
    });
    await waitFor(() => expect(within(row).queryByText(requiredMessage)).not.toBeInTheDocument());
    expect(within(row).getByRole('textbox', { name: numberLabel })).not.toBeRequired();
    await userEvent.click(within(row).getByRole('button', { name: /Lagre og lukk/i }));
    await waitFor(() => expect(screen.queryByTestId('group-edit-container')).not.toBeInTheDocument());
  });

  it('discards temporary lookup errors when their row is removed', async () => {
    const { formDataMethods } = await render({ repeating: true, required: false });
    await userEvent.click(screen.getAllByRole('button', { name: /Rediger/i })[1]);
    await userEvent.click(screen.getByRole('button', { name: /Hent opplysninger/i }));
    expect(screen.getByRole('textbox', { name: numberLabel })).toHaveAttribute('aria-invalid', 'true');
    act(() =>
      formDataMethods.removeFromListCallback({
        reference: { dataType: defaultDataTypeMock, field: 'lookups' },
        callback: (row) => row[ALTINN_ROW_ID] === 'row-1',
      }),
    );
    await waitFor(() => expect(screen.queryByTestId('group-edit-container')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Rediger/i }));
    expect(screen.getByRole('textbox', { name: numberLabel })).toHaveAttribute('aria-invalid', 'false');
    expect(document.querySelector('[data-componentid="lookup-1"]')).not.toBeInTheDocument();
  });

  it('displays backend validation for every data model binding', async () => {
    await render({ backend: true, required: false });
    for (const binding of bindings) {
      expect(screen.getByText(`Invalid ${binding}`)).toBeInTheDocument();
    }
  });

  it('displays backend validation for every binding in a repeating row', async () => {
    await render({ repeating: true, backend: true, required: false, showValidations: false });
    await userEvent.click(screen.getAllByRole('button', { name: /Rediger/i })[0]);
    const row = screen.getByTestId('group-edit-container');
    await userEvent.click(within(row).getByRole('button', { name: /Lagre og lukk/i }));
    for (const binding of bindings) {
      await waitFor(() => expect(within(row).getByText(`Invalid ${binding}`)).toBeInTheDocument());
    }
  });
});
