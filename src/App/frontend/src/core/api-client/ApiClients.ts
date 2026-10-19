import type {
  ActionsApi,
  AttachmentsApi,
  AuthApi,
  DataListsApi,
  ExternalApiClient,
  FormBootstrapApi,
  FormDataApi,
  OptionsApi,
  PaymentApi,
  ProcessApi,
  ResourcesApi,
  SubformApi,
} from 'src/core/api-client/app.api';
import type { BackendValidationApi } from 'src/core/api-client/backendValidation.api';
import type { InstanceApi } from 'src/core/api-client/instance.api';
import type { LookupApi } from 'src/core/api-client/lookup.api';
import type { PartyApi } from 'src/core/api-client/party.api';
import type { SigningApi } from 'src/core/api-client/signing.api';
import type { TextResourcesApi } from 'src/core/api-client/textResources.api';

export interface ApiClients {
  processApi: ProcessApi;
  attachmentsApi: AttachmentsApi;
  actionsApi: ActionsApi;
  subformApi: SubformApi;
  formDataApi: FormDataApi;
  resourcesApi: ResourcesApi;
  authApi: AuthApi;
  optionsApi: OptionsApi;
  dataListsApi: DataListsApi;
  paymentApi: PaymentApi;
  formBootstrapApi: FormBootstrapApi;
  externalApi: ExternalApiClient;
  backendValidationApi: BackendValidationApi;
  instanceApi: InstanceApi;
  partyApi: PartyApi;
  textResourcesApi: TextResourcesApi;
  signingApi: SigningApi;
  lookupApi: LookupApi;
}
