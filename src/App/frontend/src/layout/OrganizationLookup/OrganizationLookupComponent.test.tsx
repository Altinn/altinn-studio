import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { vi } from 'vitest';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultMockDataElementId, getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { OrganizationLookupComponent } from 'src/layout/OrganizationLookup/OrganizationLookupComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import { httpGet } from 'src/utils/network/networking';
import type { ILayoutCollection } from 'src/layout/layout';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

vi.mock('src/utils/network/networking', () => ({
  httpGet: vi.fn(),
}));

const mockedHttpGet = vi.mocked(httpGet);

const validOrgNr = '043871668';
const orgName = 'Skog og Fjell Consulting';
const orgLookupId = 'org-lookup';
const textSiblingId = 'text-sibling';

const defaultBindings = {
  orgnr: { field: 'orgNr', dataType: defaultDataTypeMock },
  name: { field: 'orgName', dataType: defaultDataTypeMock },
};

const render = async ({
  component,
  queries,
  ...rest
}: Partial<RenderGenericComponentTestProps<'OrganizationLookup'>> = {}) =>
  await renderGenericComponentTest({
    type: 'OrganizationLookup',
    renderer: (props) => <OrganizationLookupComponent {...props} />,
    component: {
      id: orgLookupId,
      dataModelBindings: defaultBindings,
      textResourceBindings: {
        title: 'Organization lookup',
      },
      ...component,
    },
    queries: {
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock((obj) => {
          obj.dataModels[defaultDataTypeMock].initialData = {
            orgNr: '',
            orgName: '',
            address: { name: '', street: '' },
          };
        }),
      ...queries,
    },
    ...rest,
  });

const layoutWithSiblingText: ILayoutCollection = {
  FormLayout: {
    data: {
      layout: [
        {
          id: 'group-1',
          type: 'Group',
          children: [orgLookupId, textSiblingId],
        },
        {
          id: orgLookupId,
          type: 'OrganizationLookup',
          dataModelBindings: defaultBindings,
          textResourceBindings: {
            title: 'Organization lookup',
          },
        },
        {
          id: textSiblingId,
          type: 'Text',
          textResourceBindings: {
            title: 'Org name title',
          },
          value: ['dataModel', 'address.name', defaultDataTypeMock],
        },
        {
          id: 'text-street',
          type: 'Text',
          value: ['dataModel', 'address.street', defaultDataTypeMock],
        },
      ],
    },
  },
};

describe('OrganizationLookupComponent', () => {
  beforeEach(() => {
    mockedHttpGet.mockReset();
  });

  it('renders lookup field and submit button', async () => {
    await render();

    expect(screen.getByRole('textbox', { name: /Organisasjonsnummer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hent opplysninger/i })).toBeInTheDocument();
  });

  it('shows validation error for invalid organization number', async () => {
    await render();

    await userEvent.type(screen.getByRole('textbox', { name: /Organisasjonsnummer/i }), '123456789');
    await userEvent.click(screen.getByRole('button', { name: /Hent opplysninger/i }));

    expect(document.querySelector('[data-field="validation"]')).toHaveTextContent(/Organisasjonsnummeret er ugyldig/i);
    expect(mockedHttpGet).not.toHaveBeenCalled();

    const statusRegion = screen.getByTestId('organization-lookup-status');
    await waitFor(() => {
      expect(statusRegion).toHaveTextContent(/Organisasjonsnummeret er ugyldig/i);
    });
  });

  it('fetches organization, announces details, and allows clearing', async () => {
    mockedHttpGet.mockResolvedValue({
      success: true,
      organisationDetails: {
        orgNr: validOrgNr,
        name: orgName,
      },
    });

    const { mutations } = await render({
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.layouts = layoutWithSiblingText;
            obj.dataModels[defaultDataTypeMock].initialData = {
              orgNr: '',
              orgName: '',
              address: { name: 'Sibling Name', street: 'Street 1' },
            };
          }),
      },
    });

    await userEvent.type(screen.getByRole('textbox', { name: /Organisasjonsnummer/i }), validOrgNr);
    await userEvent.click(screen.getByRole('button', { name: /Hent opplysninger/i }));

    await waitFor(() => expect(mockedHttpGet).toHaveBeenCalled());
    await waitFor(() => expect(mutations.doPatchMultipleFormData.mock).toHaveBeenCalled());
    mutations.doPatchMultipleFormData.resolve({
      data: {
        validationIssues: [],
        newDataModels: [
          {
            dataElementId: defaultMockDataElementId,
            data: {
              orgNr: validOrgNr,
              orgName,
              address: { name: 'Sibling Name', street: 'Street 1' },
            },
          },
        ],
        instance: getInstanceDataMock(),
      },
    });
    await waitFor(() => expect(screen.getByRole('button', { name: /Fjern/i })).toBeInTheDocument());

    expect(screen.getByLabelText('Organisasjonsnavn')).toHaveTextContent(orgName);

    const statusRegion = screen.getByTestId('organization-lookup-status');
    await waitFor(() => {
      expect(statusRegion).toHaveTextContent(`Organisasjonsnummer ${validOrgNr}`);
      expect(statusRegion).toHaveTextContent('Sibling Name');
    });

    await userEvent.click(screen.getByRole('button', { name: /Fjern/i }));

    expect(screen.getByRole('button', { name: /Hent opplysninger/i })).toBeInTheDocument();
    expect(statusRegion).toHaveTextContent('');
  });

  it('submits lookup on Enter key', async () => {
    mockedHttpGet.mockResolvedValue({
      success: true,
      organisationDetails: {
        orgNr: validOrgNr,
        name: orgName,
      },
    });

    await render();

    await userEvent.type(screen.getByRole('textbox', { name: /Organisasjonsnummer/i }), `${validOrgNr}{Enter}`);

    await waitFor(() => expect(mockedHttpGet).toHaveBeenCalled());
  });

  it('shows not found error when lookup returns no organization', async () => {
    mockedHttpGet.mockResolvedValue({
      success: false,
      organisationDetails: null,
    });

    await render();

    await userEvent.type(screen.getByRole('textbox', { name: /Organisasjonsnummer/i }), validOrgNr);
    await userEvent.click(screen.getByRole('button', { name: /Hent opplysninger/i }));

    await waitFor(() => {
      expect(document.querySelector('[data-field="validation"]')).toHaveTextContent(
        /Organisasjonsnummeret ble ikke funnet i enhetsregisteret/i,
      );
    });
  });

  it('shows invalid response error when lookup response is invalid', async () => {
    mockedHttpGet.mockResolvedValue({ unexpected: true });

    await render();

    await userEvent.type(screen.getByRole('textbox', { name: /Organisasjonsnummer/i }), validOrgNr);
    await userEvent.click(screen.getByRole('button', { name: /Hent opplysninger/i }));

    expect(await screen.findByText(/Ugyldig respons fra server/i)).toBeInTheDocument();
  });

  it('shows unknown error when lookup request fails', async () => {
    mockedHttpGet.mockRejectedValue(new Error('network error'));

    await render();

    await userEvent.type(screen.getByRole('textbox', { name: /Organisasjonsnummer/i }), validOrgNr);
    await userEvent.click(screen.getByRole('button', { name: /Hent opplysninger/i }));

    expect(await screen.findByText(/Ukjent feil. Vennligst prøv igjen senere/i)).toBeInTheDocument();
  });

  it('does not render action buttons when read only', async () => {
    await render({
      component: {
        readOnly: true,
      },
    });

    expect(screen.queryByRole('button', { name: /Hent opplysninger/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Fjern/i })).not.toBeInTheDocument();
  });
});
