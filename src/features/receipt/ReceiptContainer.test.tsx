import React from 'react';

import { screen } from '@testing-library/react';

import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { staticUseLanguageForTests } from 'src/features/language/useLanguage';
import { getSummaryDataObject, ReceiptContainer } from 'src/features/receipt/ReceiptContainer';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import { PageNavigationRouter } from 'src/test/routerUtils';
import type { SummaryDataObject } from 'src/components/table/AltinnSummaryTable';
import type { IRuntimeState } from 'src/types';
import type { IInstance, IParty } from 'src/types/shared';

interface IRender {
  autoDeleteOnProcessEnd?: boolean;
  hasPdf?: boolean;
  setCustomReceipt?: boolean;
  receiptLayoutExist?: boolean;
}

const exampleGuid = '75154373-aed4-41f7-95b4-e5b5115c2edc';
const exampleDataGuid = 'c21ebe7a-038d-4e8d-811c-0df1c16a1aa9';
const exampleDataGuid2 = 'afaee8fe-6317-4cc4-ae3a-3c8fcdec40bb';
const exampleInstanceId = `512345/${exampleGuid}`;

function buildInstance(hasPdf = true): IInstance {
  const pdfData = hasPdf
    ? [
        {
          id: exampleDataGuid,
          instanceGuid: exampleGuid,
          dataType: 'ref-data-as-pdf',
          filename: 'UI komponents App.pdf',
          contentType: 'application/pdf',
          blobStoragePath: `ttd/ui-components/${exampleGuid}/data/${exampleDataGuid}`,
          selfLinks: {
            apps: `https://local.altinn.cloud/ttd/ui-components/instances/${exampleInstanceId}/data/${exampleDataGuid}`,
            platform: `https://platform.local.altinn.cloud/storage/api/v1/instances/${exampleInstanceId}/data/${exampleDataGuid}`,
          },
          size: 15366,
          locked: false,
          refs: [],
          isRead: true,
          created: '2022-02-05T09:19:32.8710001Z' as any,
          createdBy: '12345',
          lastChanged: '2022-02-05T09:19:32.8710001Z' as any,
          lastChangedBy: '12345',
        },
      ]
    : [];

  return {
    ...getInstanceDataMock(),
    id: exampleInstanceId,
    org: 'ttd',
    data: [
      {
        id: `${exampleDataGuid2}`,
        instanceGuid: exampleGuid,
        dataType: 'test-data-model',
        contentType: 'application/xml',
        blobStoragePath: `ttd/ui-components/${exampleGuid}/data/${exampleDataGuid2}`,
        selfLinks: {
          apps: `https://local.altinn.cloud/ttd/ui-components/instances/${exampleInstanceId}/data/${exampleDataGuid2}`,
          platform: `https://platform.local.altinn.cloud/storage/api/v1/instances/${exampleInstanceId}/data/${exampleDataGuid2}`,
        },
        size: 1254,
        locked: true,
        refs: [],
        isRead: true,
        created: '2022-02-05T09:19:32.5897421Z' as any,
        createdBy: '12345',
        lastChanged: '2022-02-05T09:19:32.5897421Z' as any,
        lastChangedBy: '12345',
      },
      ...pdfData,
    ],
    lastChanged: '2022-02-05T09:19:32.8858042Z' as any,
  };
}

function getMockState({ autoDeleteOnProcessEnd = false }): IRuntimeState {
  return getInitialStateMock((state) => {
    state.organisationMetaData.allOrgs = {
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
    };
    state.applicationMetadata.applicationMetadata!.autoDeleteOnProcessEnd = autoDeleteOnProcessEnd;
  });
}

const render = async ({ autoDeleteOnProcessEnd = false, hasPdf = true }: IRender = {}) => {
  const reduxState = getMockState({ autoDeleteOnProcessEnd });
  reduxState.deprecated!.lastKnownInstance = buildInstance(hasPdf);
  reduxState.deprecated!.lastKnownProcess!.currentTask = undefined;
  reduxState.deprecated!.lastKnownProcess!.ended = '2022-02-05T09:19:32.8858042Z';

  return await renderWithInstanceAndLayout({
    renderer: () => <ReceiptContainer />,
    reduxState,
    router: PageNavigationRouter(),
    queries: {
      fetchFormData: () => Promise.resolve({}),
    },
  });
};

describe('ReceiptContainer', () => {
  it('should show download link to pdf when all data is loaded, and data includes pdf', async () => {
    await render();

    expect(
      screen.getByRole('heading', {
        name: 'Skjema er sendt inn',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        name: /Følgende er sendt inn:/,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('link', {
        name: /ui komponents app\.pdf/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('link', {
        name: /Kopi av din kvittering er sendt til ditt arkiv/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getAllByRole('link').length).toBe(2);
  });

  it('should show complex receipt when autoDeleteOnProcessEnd is false', async () => {
    await render();

    expect(
      screen.queryByText(
        /Av sikkerhetshensyn vil verken innholdet i tjenesten eller denne meldingen være synlig i Altinn etter at du har forlatt denne siden/i,
      ),
    ).not.toBeInTheDocument();
  });

  it('should show simple receipt when autoDeleteOnProcessEnd is true', async () => {
    await render({ autoDeleteOnProcessEnd: true });

    expect(
      screen.getByText(
        /Av sikkerhetshensyn vil verken innholdet i tjenesten eller denne meldingen være synlig i Altinn etter at du har forlatt denne siden/i,
      ),
    ).toBeInTheDocument();
  });
});

describe('getSummaryDataObject', () => {
  it('should return correct object', () => {
    const expected: SummaryDataObject = {
      'receipt.date_sent': {
        value: '22.08.2019 / 09:08',
        hideFromVisualTesting: true,
      },
      'receipt.receiver': {
        value: 'Testdepartementet',
      },
      'receipt.ref_num': {
        value: 'd6a414a797ae',
        hideFromVisualTesting: true,
      },
      'receipt.sender': {
        value: '01017512345-Ola Privatperson',
      },
    };

    expect(
      getSummaryDataObject({
        langTools: staticUseLanguageForTests({
          language: {},
        }),
        instanceOwnerParty: {
          partyId: '50001',
          name: 'Ola Privatperson',
          ssn: '01017512345',
          isDeleted: false,
          onlyHierarchyElementWithNoAccess: false,
        } as IParty,
        instanceGuid: '6697de17-18c7-4fb9-a428-d6a414a797ae',
        lastChangedDateTime: '22.08.2019 / 09:08',
        receiver: 'Testdepartementet',
      }),
    ).toEqual(expected);
  });
});
