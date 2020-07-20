import { getLanguageFromCode } from '../../shared/src/language';
import { IRuntimeState } from '../src/types';
import { getFormLayoutStateMock } from './formLayoutStateMock';
import { getFormDataStateMock } from './formDataStateMock';
import { applicationMetadataMock } from './applicationMetadataMock';

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
      dataModel: [],
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
    },
    instanceData: {
      error: null,
      instance: null,
    },
    instantiation: {
      error: null,
      instanceId: null,
      instantiating: null,
    },
    isLoading: {
      dataTask: false,
    },
    language: {
      language: getLanguageFromCode('1044'),
      error: null,
    },
    organisationMetaData: {
      allOrgs: null,
      error: null,
    },
    party: {
      error: null,
      parties: [],
      selectedParty: null,
    },
    process: {
      error: null,
      state: null,
    },
    profile: {
      error: null,
      profile: null,
    },
    queue: {
      appTask: null,
      dataTask: null,
    },
    textResources: {
      resources: [],
      error: null,
      language: 'nb',
    },
  };

  return {
    ...initialState,
    ...customStates,
  };
}
