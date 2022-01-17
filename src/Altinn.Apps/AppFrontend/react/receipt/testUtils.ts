import { rest } from 'msw';
import { setupServer } from 'msw/node';

import {
  IExtendedInstance,
  IProfile,
  IParty,
  IApplication,
} from '../shared/src/types';

const party: IParty = {
  partyId: '1',
  partyTypeName: 1,
  orgNumber: 1,
  ssn: 'ssn',
  unitType: 'unitType',
  name: 'name',
  isDeleted: false,
  onlyHierarchyElementWithNoAccess: false,
  childParties: [],
};

const date = new Date();

const applicationCommonFields: any = {
  description: null,
  allowedContentTypes: ['application/xml'],
  allowedContributers: null,
  appLogic: {
    autoCreate: true,
    classRef: 'Altinn.App.Models.MessageV1',
    schemaRef: null,
  },
  taskId: 'Task_1',
  maxSize: null,
  maxCount: 1,
  minCount: 1,
  grouping: null,
};

export const handlers: any = [
  rest.get(
    'https://platform.at21.altinn.cloud/receipt/api/v1/instances/mockInstanceOwnerId/6697de17-18c7-4fb9-a428-d6a414a797ae',
    (req, res, ctx) => {
      const mockApiResponse: IExtendedInstance = {
        instance: {
          title: {
            nb: 'title',
          },
          instanceState: {
            isDeleted: false,
            isMarkedForHardDelete: false,
            isArchived: false,
          },
          id: '512345/86e16da5-64d4-4354-bcb2-bf19ae0a836c',
          instanceOwner: {
            partyId: '512345',
            personNumber: '01017512345',
            organisationNumber: null,
          },
          appId: 'ttd/frontend-test',
          org: 'ttd',
          selfLinks: {
            apps: 'https://altinn3local.no/ttd/frontend-test/instances/512345/86e16da5-64d4-4354-bcb2-bf19ae0a836c',
            platform:
              'https://platform.altinn3local.no/storage/api/v1/instances/512345/86e16da5-64d4-4354-bcb2-bf19ae0a836c',
          },
          dueBefore: null,
          process: {
            started: '2022-01-13T15:32:03.6947865Z',
            startEvent: 'StartEvent_1',
            currentTask: {
              flow: 2,
              started: '2022-01-13T15:32:03.7100383Z',
              elementId: 'Task_1',
              name: 'Utfylling',
              altinnTaskType: 'data',
              ended: null,
              validated: null,
            },
            ended: null,
            endEvent: null,
          },
          status: {
            substatus: null,
          },
          data: [
            {
              id: 'cf14efac-d712-40aa-a97d-bf45666a6cdd',
              instanceGuid: '86e16da5-64d4-4354-bcb2-bf19ae0a836c',
              dataType: 'message',
              filename: null,
              contentType: 'application/xml',
              blobStoragePath:
                'ttd/frontend-test/86e16da5-64d4-4354-bcb2-bf19ae0a836c/data/cf14efac-d712-40aa-a97d-bf45666a6cdd',
              selfLinks: {
                apps: 'https://altinn3local.no/ttd/frontend-test/instances/512345/86e16da5-64d4-4354-bcb2-bf19ae0a836c/data/cf14efac-d712-40aa-a97d-bf45666a6cdd',
                platform:
                  'https://platform.altinn3local.no/storage/api/v1/instances/512345/86e16da5-64d4-4354-bcb2-bf19ae0a836c/data/cf14efac-d712-40aa-a97d-bf45666a6cdd',
              },
              size: 135,
              locked: false,
              refs: [],
              isRead: true,
              created: date,
              createdBy: '12345',
              lastChanged: date,
              lastChangedBy: '12345',
            },
          ],
          created: date,
          lastChanged: date,
        },
        party,
      };
      return res(ctx.json(mockApiResponse));
    },
  ),

  rest.get('https://altinncdn.no/orgs/altinn-orgs.json', (req, res, ctx) => {
    const mockApiResponse = {
      orgs: {
        digdir: {
          name: {
            en: 'Norwegian Digitalisation Agency',
            nb: 'Digitaliseringsdirektoratet',
            nn: 'Digitaliseringsdirektoratet',
          },
          logo: '',
          orgnr: '991825827',
          homepage: 'https://www.digdir.no',
          environments: ['tt02', 'production'],
        },
      },
    };
    return res(ctx.json(mockApiResponse));
  }),

  rest.get('http://localhost/receipt/api/v1/users/current', (req, res, ctx) => {
    const mockApiResponse: IProfile = {
      userId: 1,
      userName: 'user name',
      partyId: 1,
      party,
      userType: 1,
      profileSettingPreference: {
        language: 'nb',
        preSelectedPartyId: 1,
        doNotPromptForParty: true,
      },
    };
    return res(ctx.json(mockApiResponse));
  }),

  rest.get(
    'https://platform.at21.altinn.cloud/storage/api/v1/applications/ttd/frontend-test',
    (req, res, ctx) => {
      const mockApiResponse: IApplication = {
        id: 'ttd/frontend-test',
        org: 'ttd',
        title: { nb: 'frontend-test' },
        dataTypes: [
          {
            ...applicationCommonFields,
            id: 'message',
            allowedContentTypes: ['application/xml'],
            appLogic: {
              ...applicationCommonFields.appLogic,
              classRef: 'Altinn.App.Models.MessageV1',
            },
          },
          {
            id: 'fileUpload-message',
            allowedContentTypes: null,
            appLogic: null,
            maxSize: 5,
            maxCount: 3,
            minCount: 0,
          },
          {
            id: 'ServiceModel-test',
            appLogic: {
              ...applicationCommonFields.appLogic,

              classRef: 'Altinn.App.Models.Skjema',
            },
            taskId: 'Task_2',
          },
          {
            id: 'fileUpload-changename',
            allowedContentTypes: null,
            appLogic: null,
            taskId: 'Task_2',
            maxSize: 5,
            maxCount: 3,
            minCount: 0,
          },
          {
            id: 'nested-group',
            appLogic: {
              ...applicationCommonFields.appLogic,
              classRef: 'Altinn.App.Models.NestedGroup',
            },
            taskId: 'Task_3',
          },
          {
            id: 'ref-data-as-pdf',
            allowedContentTypes: ['application/pdf'],
            appLogic: null,
            taskId: null,
            maxCount: 0,
            minCount: 0,
          },
        ],
        partyTypesAllowed: {
          bankruptcyEstate: false,
          organisation: false,
          person: false,
          subUnit: false,
        },
        onEntry: { show: 'select-instance' },
        created: '2021-02-06T15:18:12.2060944Z',
        createdBy: 'jeeva',
        lastChanged: '2021-02-06T15:18:12.2062288Z',
        lastChangedBy: 'jeeva',
      };
      return res(ctx.json(mockApiResponse));
    },
  ),

  rest.get(
    'http://localhost/storage/api/v1/applications/ttd/frontend-test/texts/nb',
    (req, res, ctx) => {
      const mockApiResponse: any = {
        id: 'ttd-frontend-test-nb',
        org: 'ttd',
        language: 'nb',
        resources: [
          {
            id: '37130.SkattemeldingEndringEtterFristPostdatadef37130.Label',
            value:
              'Post i RF-1030 Skattemelding for formues- og inntektsskatt som skal  endres',
          },
          {
            id: '37131.SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131.Label',
            value: '1\\. **Endre fra**',
          },
          {
            id: '37132.SkattemeldingEndringEtterFristNyttBelopdatadef37132.Label',
            value: '2\\. Endre verdi {0} til ',
            variables: [
              {
                key: 'Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788[{0}].SkattemeldingEndringEtterFristOpprinneligBelop-datadef-37131.value',
                dataSource: 'dataModel.nested-group',
              },
            ],
          },
          {
            id: '37133.SkattemeldingEndringEtterFristKommentardatadef37133.Label',
            value: 'Kommentarer',
          },
          {
            id: '68.OppgavegiverNavndatadef68.Label',
            value: 'Oppgave giver navn',
          },
          {
            id: 'BegrunnelseAnnet',
            value:
              'Forklar hvorfor du ønsker å ta navnet, og eventuelt hvilken tilknytning du har til navnet:',
          },
          {
            id: 'BegrunnelseGard1',
            value: 'Gårdsbruk du vil ta navnet fra',
          },
          {
            id: 'BegrunnelseGard2',
            value: 'Kommune gårdsbruket ligger i',
          },
          { id: 'BegrunnelseGard3', value: 'Gårdsnummer' },
          { id: 'BegrunnelseGard4', value: 'Bruksnummer' },
          {
            id: 'BegrunnelseGard5',
            value: 'Forklar din tilknytning til gårdsbruket',
          },
          {
            id: 'BegrunnelseNyttNavn',
            value:
              'Du ønsker å ta et navn som du tror er nytt i Norge. Forklar hvorfor du ønsker dette navnet:',
          },
          {
            id: 'BegrunnelseSamboer1',
            value: 'Etternavn på samboer',
          },
          {
            id: 'BegrunnelseSamboer2',
            value: 'Fødselsnummer på samboer',
          },
          {
            id: 'BegrunnelseSlektskap',
            value:
              'Forklar hvem du tar navnet fra, og hvilken side slektskapet ligger',
          },
          {
            id: 'BegrunnelseSteforeldre',
            value:
              'Etternavn på ste- eller fosterforeldre du ønsker å ta navnet til',
          },
          {
            id: 'BegrunnelseValgNavn',
            value: 'Vennligst oppgi begrunnelse for endring av navn',
          },
          {
            id: 'BekreftNavnTittel',
            value: 'Bekreftelse av navn',
          },
          { id: 'DineEndringer', value: 'Dine endringer' },
          {
            id: 'EndreNavnFra',
            value: 'Du har valgt å endre:',
          },
          { id: 'EndreNavnTil', value: 'Til:' },
          { id: 'Epost', value: 'E-post' },
          { id: 'Fodselsnummer', value: 'Fødselsnummer' },
          {
            id: 'HintEtternavn',
            value: 'Bindestrek må benyttes dersom du ønsker to etternavn.',
          },
          {
            id: 'HintMellomnavn',
            value:
              'Mellomnavn må være et navn som kan benyttes som etternavn. ',
          },
          {
            id: 'Kontaktinformasjon',
            value: 'Kontaktinformasjon',
          },
          { id: 'NavarendeNavn', value: 'Nåværende navn' },
          {
            id: 'PersonNyttEtternavn',
            value: 'Nytt etternavn',
          },
          { id: 'PersonNyttFornavn', value: 'Nytt fornavn' },
          {
            id: 'PersonNyttFornavn.helptext',
            value:
              'Tenk deg godt om, det tar 10 år før du kan endre navn igjen',
          },
          {
            id: 'PersonNyttMellomnavn',
            value: 'Nytt mellomnavn',
          },
          { id: 'ServiceName', value: 'frontend-test' },
          {
            id: 'confirm.body',
            value: 'Vennligst vent, endrer navn til {1}.',
            variables: [
              {
                key: 'Innledning-grp-9309.Kontaktinformasjon-grp-9311.MelderFultnavn.value',
                dataSource: 'dataModel.ServiceModel-test',
              },
              {
                key: 'Innledning-grp-9309.NavneendringenGjelderFor-grp-9310.SubjektFornavnFolkeregistrert-datadef-34730.value',
                dataSource: 'dataModel.ServiceModel-test',
              },
            ],
          },
          {
            id: 'datofeltet',
            value: 'Når vil du at navnendringen skal skje?',
          },
          {
            id: 'error.testValue',
            value:
              "test er ikke en gyldig <a href='https://www.altinn.no/' target='_blank'>verdi</a>",
          },
          {
            id: 'kontaktinfoBeskrivelse',
            value:
              'Denne kontaktinformasjonen brukes til å kontakte deg hvis det er noen spørsmål rundt informasjonen du har sendt inn.',
          },
          { id: 'messageAttachments', value: 'Vedlegg' },
          {
            id: 'messageBody',
            value:
              'Bruke dette app for å teste app frontend <br/> 1. Melding <br/> 2. Endring-av-navn-v2 <br/> 3. Repeterende gruppe',
          },
          {
            id: 'messageTitle',
            value: '## Appen for test av app frontend',
          },
          {
            id: 'messageTitleHelp',
            value: 'Bruk dette appen for test av app frontend',
          },
          { id: 'summaryTitle', value: '## Oppsummering' },
          {
            id: 'vedlegg',
            value: 'Last opp eventuell dokumentasjon for ditt nye navn',
          },
        ],
      };
      return res(ctx.json(mockApiResponse));
    },
  ),
];

export { setupServer, rest };
