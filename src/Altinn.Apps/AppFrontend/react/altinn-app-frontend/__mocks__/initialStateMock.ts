import { getLanguageFromCode } from '../../shared/src/language';
import { IRuntimeState } from '../src/types';
import { getFormLayoutStateMock } from './formLayoutStateMock';
import { getFormDataStateMock } from './formDataStateMock';
import { applicationMetadataMock } from './applicationMetadataMock';
import { IParty } from '../../shared/src';
import { getInstanceDataStateMock } from './instanceDataStateMock';
import { getProfileStateMock } from './profileStateMock';

export const mockParty: IParty = {
  partyId: '12345',
  name: 'Ola Privatperson',
  ssn: '01017512345',
  partyTypeName: null,
  orgNumber: null,
  unitType: null,
  isDeleted: false,
  onlyHierarchyElementWithNoAccess: false,
  childParties: null,
};

export function getInitialStateMock(customStates?: Partial<IRuntimeState>): IRuntimeState {
  const initialState: IRuntimeState = {
    applicationMetadata: {
      applicationMetadata: applicationMetadataMock,
      error: null,
    },
    attachments: {
      attachments: null,
    },
    formData: getFormDataStateMock(),
    formDataModel: {
      error: null,
      schemas: null,
    },
    formDynamics: {
      apis: null,
      conditionalRendering: null,
      error: null,
      ruleConnection: null,
    },
    formLayout: getFormLayoutStateMock(),
    formRules: {
      error: null,
      fetched: false,
      fetching: false,
      model: null,
    },
    formValidations: {
      validations: {},
      error: null,
      invalidDataTypes: [],
      currentSingleFieldValidation: null,
    },
    instanceData: getInstanceDataStateMock(),
    instantiation: {
      error: null,
      instanceId: null,
      instantiating: null,
    },
    isLoading: {
      dataTask: false,
      stateless: null,
    },
    language: {
      language: getLanguageFromCode('nb'),
      error: null,
    },
    organisationMetaData: {
      allOrgs: {
        mockOrg: {
          name: {
            en: 'Mock Ministry',
            nb: 'Mockdepartementet',
            nn: 'Mockdepartementet',
          },
          logo: '',
          orgnr: '',
          homepage: '',
          environments: [
            'tt02',
            'production',
          ],
        },
      },
      error: null,
    },
    party: {
      error: null,
      parties: [
        mockParty,
      ],
      selectedParty: mockParty,
    },
    process: {
      error: null,
      taskType: null,
      taskId: null,
    },
    profile: getProfileStateMock(),
    queue: {
      appTask: null,
      dataTask: null,
      infoTask: null,
      stateless: null,
    },
    textResources: {
      resources: [],
      error: null,
      language: 'nb',
    },
    optionState: {
      options: {},
      error: null,
    },
  };

  return {
    ...initialState,
    ...customStates,
  };
}
