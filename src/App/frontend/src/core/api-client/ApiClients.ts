import type { BackendValidationApi } from 'src/core/api-client/backendValidation.api';
import type { InstanceApi } from 'src/core/api-client/instance.api';
import type { OptionsApi } from 'src/core/api-client/options.api';
import type { PartyApi } from 'src/core/api-client/party.api';
import type { TextResourcesApi } from 'src/core/api-client/textResources.api';

export interface ApiClients {
  backendValidationApi: BackendValidationApi;
  partyApi: PartyApi;
  instanceApi: InstanceApi;
  textResourcesApi: TextResourcesApi;
  optionsApi: OptionsApi;
}
