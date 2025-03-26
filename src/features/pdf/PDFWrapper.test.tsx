import React from 'react';

import { jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';
import type { AxiosError } from 'axios';

import { getIncomingApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getPartyMock, getServiceOwnerPartyMock } from 'src/__mocks__/getPartyMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { getProfileMock } from 'src/__mocks__/getProfileMock';
import { ProcessWrapper } from 'src/components/wrappers/ProcessWrapper';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { fetchApplicationMetadata, fetchProcessState } from 'src/queries/queries';
import { InstanceRouter, renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import type { AppQueries } from 'src/queries/types';

const exampleGuid = '75154373-aed4-41f7-95b4-e5b5115c2edc';
const exampleInstanceId = `512345/${exampleGuid}`;

enum RenderAs {
  User,
  ServiceOwner,
}

const axios400Error: AxiosError = {
  isAxiosError: true,
  code: 'ERR_BAD_REQUEST',
  status: 400,
  response: {
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: null!,
    data: undefined,
  },
  name: 'AxiosError',
  message: 'Request failed with status code 400',
  toJSON: () => ({}),
};

const buildInstance = () =>
  getInstanceDataMock((i) => {
    i.org = 'brg';
    i.id = exampleInstanceId;
    i.lastChanged = '2022-02-05T09:19:32.8858042Z';
  });

const render = async (renderAs: RenderAs, queriesOverride?: Partial<AppQueries>) => {
  jest.mocked(fetchApplicationMetadata).mockImplementationOnce(async () =>
    getIncomingApplicationMetadataMock((m) => {
      m.org = 'brg';
      m.partyTypesAllowed.person = true;
      m.partyTypesAllowed.organisation = true;
    }),
  );
  jest.mocked(fetchProcessState).mockImplementation(async () =>
    getProcessDataMock((p) => {
      p.processTasks = [p.currentTask!];
    }),
  );

  const party = renderAs === RenderAs.User ? getPartyMock() : getServiceOwnerPartyMock();

  return await renderWithoutInstanceAndLayout({
    renderer: () => (
      <InstanceProvider>
        <ProcessWrapper />
      </InstanceProvider>
    ),
    router: ({ children }) => (
      <InstanceRouter
        instanceId={exampleInstanceId}
        taskId='Task_1'
        initialPage=''
        query='pdf=1'
      >
        {children}
      </InstanceRouter>
    ),
    queries: {
      fetchOrgs: async () => ({
        orgs: {
          brg: {
            name: {
              en: 'Brønnøysund Register Centre',
              nb: 'Brønnøysundregistrene',
              nn: 'Brønnøysundregistera',
            },
            logo: 'https://altinncdn.no/orgs/brg/brreg.png',
            orgnr: '974760673',
            homepage: 'https://www.brreg.no',
            environments: ['tt02', 'production'],
          },
        },
      }),
      fetchInstanceData: async () => buildInstance(),
      fetchFormData: async () => ({}),
      fetchLayouts: async () => ({}),
      fetchCurrentParty: async () => party,
      fetchPartiesAllowedToInstantiate: async () => [party],
      fetchUserProfile: async () => {
        if (renderAs === RenderAs.User) {
          return getProfileMock();
        }
        throw axios400Error;
      },
      ...queriesOverride,
    },
  });
};

describe('PDFWrapper', () => {
  it.each([RenderAs.User, RenderAs.ServiceOwner])(`should render PDF - %s`, async (renderAs) => {
    const result = await render(renderAs);

    await waitFor(() => expect(result.container.querySelector('#readyForPrint')).not.toBeNull(), { timeout: 5000 });

    if (renderAs === RenderAs.ServiceOwner) {
      expect(await screen.queryByText('Avsender:')).toBeNull();
      expect(await screen.queryByText('01017512345-Ola Privatperson')).toBeNull();
    } else if (renderAs === RenderAs.User) {
      expect(await screen.queryByText('Avsender:')).not.toBeNull();
      expect(await screen.queryByText('01017512345-Ola Privatperson')).not.toBeNull();
    }
  });
});
