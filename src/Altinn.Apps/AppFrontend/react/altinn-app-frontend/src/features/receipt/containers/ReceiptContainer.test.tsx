import React from 'react';
import { screen } from '@testing-library/react';
import { MemoryRouter as Router, Route } from 'react-router-dom';

import { renderWithProviders } from '../../../../testUtils';

import ReceiptContainer, {
  returnInstanceMetaDataObject,
} from './ReceiptContainer';

interface IRender {
  populateStore?: boolean;
  autoDeleteOnProcessEnd?: boolean;
  hasPdf?: boolean;
}

const render = ({
  populateStore = true,
  autoDeleteOnProcessEnd = false,
  hasPdf = true,
}: IRender = {}) => {
  const url = '/instance/512345/75154373-aed4-41f7-95b4-e5b5115c2edc';
  const pathMatch = '/instance/:partyId/:instanceGuid';

  const pdfData = hasPdf
    ? [
        {
          id: 'c21ebe7a-038d-4e8d-811c-0df1c16a1aa9',
          instanceGuid: '75154373-aed4-41f7-95b4-e5b5115c2edc',
          dataType: 'ref-data-as-pdf',
          filename: 'UI komponents App.pdf',
          contentType: 'application/pdf',
          blobStoragePath:
            'ttd/ui-components/75154373-aed4-41f7-95b4-e5b5115c2edc/data/c21ebe7a-038d-4e8d-811c-0df1c16a1aa9',
          selfLinks: {
            apps: 'https://altinn3local.no/ttd/ui-components/instances/512345/75154373-aed4-41f7-95b4-e5b5115c2edc/data/c21ebe7a-038d-4e8d-811c-0df1c16a1aa9',
            platform:
              'https://platform.altinn3local.no/storage/api/v1/instances/512345/75154373-aed4-41f7-95b4-e5b5115c2edc/data/c21ebe7a-038d-4e8d-811c-0df1c16a1aa9',
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

  const mockState = {
    organisationMetaData: {
      allOrgs: {
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
    },
    applicationMetadata: {
      applicationMetadata: {
        id: 'ttd/ui-components',
        org: 'ttd',
        title: {
          nb: 'App frontend komponenter',
          en: 'App frontend components',
        },
        dataTypes: [
          {
            id: 'default',
            description: null,
            allowedContentTypes: ['application/xml'],
            allowedContributers: null,
            appLogic: {
              autoCreate: true,
              classRef: 'Altinn.App.Models.Skjema',
              schemaRef: null,
            },
            taskId: 'Task_1',
            maxSize: null,
            maxCount: 1,
            minCount: 1,
            grouping: null,
          },
          {
            id: 'ref-data-as-pdf',
            description: null,
            allowedContentTypes: ['application/pdf'],
            allowedContributers: null,
            appLogic: null,
            taskId: null,
            maxSize: null,
            maxCount: 0,
            minCount: 0,
            grouping: null,
          },
          {
            id: 'vedlegg',
            description: null,
            allowedContentTypes: null,
            allowedContributers: null,
            appLogic: null,
            taskId: 'Task_1',
            maxSize: 1,
            maxCount: 3,
            minCount: 0,
            grouping: null,
          },
        ],
        partyTypesAllowed: {
          bankruptcyEstate: false,
          organisation: false,
          person: false,
          subUnit: false,
        },
        autoDeleteOnProcessEnd,
        created: '2020-03-02T07:32:53.8640778Z',
        createdBy: 'jeeva',
        lastChanged: '2020-03-02T07:32:53.8641776Z',
        lastChangedBy: 'jeeva',
      },
    },
    instanceData: {
      instance: {
        id: '512345/75154373-aed4-41f7-95b4-e5b5115c2edc',
        instanceOwner: {
          partyId: '512345',
          personNumber: '01017512345',
          organisationNumber: null,
        },
        org: 'ttd',
        data: [
          {
            id: 'afaee8fe-6317-4cc4-ae3a-3c8fcdec40bb',
            instanceGuid: '75154373-aed4-41f7-95b4-e5b5115c2edc',
            dataType: 'default',
            filename: null,
            contentType: 'application/xml',
            blobStoragePath:
              'ttd/ui-components/75154373-aed4-41f7-95b4-e5b5115c2edc/data/afaee8fe-6317-4cc4-ae3a-3c8fcdec40bb',
            selfLinks: {
              apps: 'https://altinn3local.no/ttd/ui-components/instances/512345/75154373-aed4-41f7-95b4-e5b5115c2edc/data/afaee8fe-6317-4cc4-ae3a-3c8fcdec40bb',
              platform:
                'https://platform.altinn3local.no/storage/api/v1/instances/512345/75154373-aed4-41f7-95b4-e5b5115c2edc/data/afaee8fe-6317-4cc4-ae3a-3c8fcdec40bb',
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
      },
    },
    language: {
      language: {},
    },
    party: {
      parties: [
        {
          partyId: '512345',
          orgNumber: null,
          ssn: '01017512345',
          name: 'Ola Nordmann',
          person: {
            ssn: '01017512345',
            name: 'Ola Nordmann',
            firstName: 'Ola',
            middleName: '',
            lastName: 'Nordmann',
            telephoneNumber: '12345678',
            mobileNumber: '87654321',
            mailingAddress: 'Blåbæreveien 7',
            mailingPostalCode: 8450,
            mailingPostalCity: 'Stokmarknes',
            addressMunicipalNumber: 1866,
            addressMunicipalName: 'Hadsel',
            addressStreetName: 'Blåbærveien',
            addressHouseNumber: 7,
            addressHouseLetter: null,
            addressPostalCode: 8450,
            addressCity: 'Stokarknes',
          },
        },
      ],
    },
    profile: {
      profile: {
        userId: 12345,
        userName: 'OlaNordmann',
        phoneNumber: '12345678',
        email: 'test@test.com',
        partyId: 512345,
        party: {
          partyId: '512345',
          partyTypeName: 1,
          orgNumber: null,
          ssn: '01017512345',
          unitType: null,
          name: 'Ola Nordmann',
          isDeleted: false,
          onlyHierarchyElementWithNoAccess: false,
          person: {
            ssn: '01017512345',
            name: 'Ola Nordmann',
            firstName: 'Ola',
            middleName: '',
            lastName: 'Nordmann',
            telephoneNumber: '12345678',
            mobileNumber: '87654321',
            mailingAddress: 'Blåbæreveien 7',
            mailingPostalCode: 8450,
            mailingPostalCity: 'Stokmarknes',
            addressMunicipalNumber: 1866,
            addressMunicipalName: 'Hadsel',
            addressStreetName: 'Blåbærveien',
            addressHouseNumber: 7,
            addressHouseLetter: null,
            addressPostalCode: 8450,
            addressCity: 'Stokarknes',
          },
        },
        userType: 0,
        profileSettingPreference: {
          language: 'nb',
          preSelectedPartyId: 0,
          doNotPromptForParty: false,
        },
      },
    },
  } as any;

  renderWithProviders(
    <Router initialEntries={[url]}>
      <Route exact path={pathMatch} component={ReceiptContainer} />
    </Router>,
    {
      preloadedState: populateStore ? mockState : {},
    },
  );
};

describe('ReceiptContainer', () => {
  it('should show loader when not all data is loaded', () => {
    render({ populateStore: false });

    expect(
      screen.getByRole('img', {
        name: /loading\.\.\./i,
      }),
    ).toBeInTheDocument();
  });

  it('should show download link to pdf when all data is loaded, and data includes pdf', () => {
    render();

    expect(
      screen.queryByRole('img', {
        name: /loading\.\.\./i,
      }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        name: /app frontend komponenter receipt\.title_part_is_submitted/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('link', {
        name: /ui komponents app\.pdf/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('link', {
        name: /receipt\.subtitle/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getAllByRole('link').length).toBe(2);
  });

  it('should not show download link to pdf when all data is loaded, and data does not include pdf', () => {
    render({ hasPdf: false });

    expect(
      screen.queryByRole('img', {
        name: /loading\.\.\./i,
      }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        name: /app frontend komponenter receipt\.title_part_is_submitted/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('link', {
        name: /receipt\.subtitle/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getAllByRole('link').length).toBe(1);
  });

  it('should show complex receipt when autoDeleteOnProcessEnd is false', () => {
    render({ autoDeleteOnProcessEnd: false });

    expect(screen.queryByText(/receipt\.body_simple/i)).not.toBeInTheDocument();
  });

  it('should show simple receipt when autoDeleteOnProcessEnd is true', () => {
    render({ autoDeleteOnProcessEnd: true });

    expect(screen.getByText(/receipt\.body_simple/i)).toBeInTheDocument();
  });
});

describe('returnInstanceMetaDataObject', () => {
  it('should return correct object', () => {
    const testData = {
      orgsData: {
        tdd: {
          name: {
            en: 'Test Ministry',
            nb: 'Testdepartementet',
            nn: 'Testdepartementet',
          },
          logo: '',
          orgnr: '',
          homepage: '',
        },
        ttd: {
          name: {
            en: 'Test Ministry',
            nb: 'Testdepartementet',
            nn: 'Testdepartementet',
          },
          logo: '',
          orgnr: '',
          homepage: '',
        },
      },
      languageData: null,
      profileData: {
        profile: {
          userId: 1,
          userName: 'OlaNordmann',
          phoneNumber: '90012345',
          email: 'ola@altinncore.no',
          partyId: 50001,
          party: {
            partyId: 50001,
            partyTypeName: 1,
            orgNumber: null,
            ssn: null,
            unitType: null,
            name: 'Ola Privatperson',
            isDeleted: false,
            onlyHierarchyElementWithNoAccess: false,
            person: {
              ssn: '01017512345',
              name: null,
              firstName: 'Ola',
              middleName: null,
              lastName: 'Privatperson',
              telephoneNumber: null,
              mobileNumber: null,
              mailingAddress: null,
              mailingPostalCode: null,
              mailingPostalCity: null,
              addressMunicipalNumber: null,
              addressMunicipalName: null,
              addressStreetName: null,
              addressHouseNumber: null,
              addressHouseLetter: null,
              addressPostalCode: null,
              addressCity: null,
            },
            organisation: null,
          },
          userType: 1,
          profileSettingPreference: null,
        },
      },
      instanceGuid: '6697de17-18c7-4fb9-a428-d6a414a797ae',
      userLanguageString: 'nb',
      lastChangedDateTime: '22.08.2019 / 09:08',
      instance: {
        org: 'tdd',
      },
      instanceOwnerParty: {
        partyId: 50001,
        name: 'Ola Privatperson',
        ssn: '01017512345',
      },
    };

    const expected = {
      'receipt.date_sent': '22.08.2019 / 09:08',
      'receipt.receiver': 'Testdepartementet',
      'receipt.ref_num': 'd6a414a797ae',
      'receipt.sender': '01017512345-Ola Privatperson',
    };

    expect(
      returnInstanceMetaDataObject(
        testData.orgsData,
        testData.languageData,
        testData.instanceOwnerParty,
        testData.instanceGuid,
        testData.userLanguageString,
        testData.lastChangedDateTime,
        testData.instance.org,
      ),
    ).toEqual(expected);
  });
});
