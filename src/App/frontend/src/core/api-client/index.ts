import {
  actionsApi,
  attachmentsApi,
  authApi,
  dataListsApi,
  externalApi,
  formBootstrapApi,
  formDataApi,
  optionsApi,
  paymentApi,
  processApi,
  resourcesApi,
  subformApi,
} from 'src/core/api-client/app.api';
import { backendValidationApi } from 'src/core/api-client/backendValidation.api';
import { instanceApi } from 'src/core/api-client/instance.api';
import { lookupApi } from 'src/core/api-client/lookup.api';
import { partyApi } from 'src/core/api-client/party.api';
import { signingApi } from 'src/core/api-client/signing.api';
import { textResourcesApi } from 'src/core/api-client/textResources.api';
import type { ApiClients } from 'src/core/api-client/ApiClients';

export const apiClients: ApiClients = {
  processApi,
  attachmentsApi,
  actionsApi,
  subformApi,
  formDataApi,
  resourcesApi,
  authApi,
  optionsApi,
  dataListsApi,
  paymentApi,
  formBootstrapApi,
  externalApi,
  backendValidationApi,
  instanceApi,
  partyApi,
  textResourcesApi,
  signingApi,
  lookupApi,
};

export { partyApi, instanceApi, textResourcesApi, backendValidationApi };
