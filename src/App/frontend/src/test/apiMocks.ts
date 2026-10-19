import { AxiosHeaders } from 'axios';
import { vi } from 'vitest';
import type { AxiosResponse } from 'axios';

import { getDataListMock } from 'src/__mocks__/getDataListMock';
import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { getLogoMock } from 'src/__mocks__/getLogoMock';
import { orderDetailsResponsePayload } from 'src/__mocks__/getOrderDetailsPayloadMock';
import { getPartyMock } from 'src/__mocks__/getPartyMock';
import { paymentResponsePayload } from 'src/__mocks__/getPaymentPayloadMock';
import { apiClients } from 'src/core/api-client';
import type { ApiClients } from 'src/core/api-client/ApiClients';

export type ApiOverrides = { [Client in keyof ApiClients]?: Partial<ApiClients[Client]> };

/** Mock an API method, with typed controls for a response that stays pending. */
export function apiMock<Args extends unknown[], Result>(
  method: (...args: Args) => Promise<Result>,
  implementation?: (...args: Args) => Promise<NoInfer<Result>>,
) {
  let finish: (value: Result) => void = () => {
    throw new Error('No pending API request to resolve');
  };
  let fail: (error: Error) => void = () => {
    throw new Error('No pending API request to reject');
  };
  const mock = vi
    .fn(
      implementation ??
        ((..._args: Args) =>
          new Promise<Result>((resolve, reject) => {
            finish = resolve;
            fail = reject;
          })),
    )
    .mockName(method.name);
  return Object.assign(mock, { resolve: (value: Result) => finish(value), reject: (error: Error) => fail(error) });
}

/** Complete HTTP response for the API methods that still return response metadata. */
export function httpResponse<T>(data: T): AxiosResponse<T> {
  return { data, status: 200, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } };
}

const defaultPostalCodesMock = (() => {
  const places: (string | null)[] = [null, 'OSLO', 'BERGEN', 'FREDRIKSTAD', 'KARDEMOMME BY'];
  const mapping: number[] = Array.from({ length: 4610 }, () => 0);
  mapping[1] = 1;
  mapping[2] = 2;
  mapping[1613] = 3;
  mapping[4609] = 4;
  return { places, mapping };
})();

export function createApiMocks(overrides: ApiOverrides = {}) {
  return {
    processApi: {
      doProcessNext: apiMock(
        apiClients.processApi.doProcessNext,
        overrides.processApi?.doProcessNext ?? (async () => httpResponse(getInstanceWithProcessMock())),
      ),
      doProcessResume: apiMock(apiClients.processApi.doProcessResume, overrides.processApi?.doProcessResume),
    },
    attachmentsApi: {
      doAttachmentUpload: apiMock(
        apiClients.attachmentsApi.doAttachmentUpload,
        overrides.attachmentsApi?.doAttachmentUpload,
      ),
      doUpdateAttachmentTags: apiMock(
        apiClients.attachmentsApi.doUpdateAttachmentTags,
        overrides.attachmentsApi?.doUpdateAttachmentTags ??
          (async ({ setTagsRequest }) => ({ tags: setTagsRequest.tags })),
      ),
      doAttachmentRemove: apiMock(
        apiClients.attachmentsApi.doAttachmentRemove,
        overrides.attachmentsApi?.doAttachmentRemove,
      ),
    },
    actionsApi: {
      doPerformAction: apiMock(apiClients.actionsApi.doPerformAction, overrides.actionsApi?.doPerformAction),
    },
    subformApi: {
      doSubformEntryAdd: apiMock(apiClients.subformApi.doSubformEntryAdd, overrides.subformApi?.doSubformEntryAdd),
      doSubformEntryDelete: apiMock(
        apiClients.subformApi.doSubformEntryDelete,
        overrides.subformApi?.doSubformEntryDelete,
      ),
    },
    formDataApi: {
      doPatchMultipleFormData: apiMock(
        apiClients.formDataApi.doPatchMultipleFormData,
        overrides.formDataApi?.doPatchMultipleFormData,
      ),
      doPostStatelessFormData: apiMock(
        apiClients.formDataApi.doPostStatelessFormData,
        overrides.formDataApi?.doPostStatelessFormData,
      ),
      fetchFormData: apiMock(
        apiClients.formDataApi.fetchFormData,
        overrides.formDataApi?.fetchFormData ??
          (async () => {
            throw new Error('Override formDataApi.fetchFormData in this test');
          }),
      ),
    },
    resourcesApi: {
      fetchLogo: apiMock(
        apiClients.resourcesApi.fetchLogo,
        overrides.resourcesApi?.fetchLogo ?? (async () => getLogoMock()),
      ),
      fetchLayoutSchema: apiMock(
        apiClients.resourcesApi.fetchLayoutSchema,
        overrides.resourcesApi?.fetchLayoutSchema ?? (async () => ({})),
      ),
      fetchPostalCodes: apiMock(
        apiClients.resourcesApi.fetchPostalCodes,
        overrides.resourcesApi?.fetchPostalCodes ?? (async () => defaultPostalCodesMock),
      ),
    },
    authApi: {
      fetchRefreshJwtToken: apiMock(
        apiClients.authApi.fetchRefreshJwtToken,
        overrides.authApi?.fetchRefreshJwtToken ?? (async () => ({})),
      ),
    },
    optionsApi: {
      fetchOptions: apiMock(
        apiClients.optionsApi.fetchOptions,
        overrides.optionsApi?.fetchOptions ?? (async () => ({ data: [], headers: {} })),
      ),
    },
    dataListsApi: {
      fetchDataList: apiMock(
        apiClients.dataListsApi.fetchDataList,
        overrides.dataListsApi?.fetchDataList ?? (async () => getDataListMock()),
      ),
    },
    paymentApi: {
      fetchPaymentInformationForTask: apiMock(
        apiClients.paymentApi.fetchPaymentInformationForTask,
        overrides.paymentApi?.fetchPaymentInformationForTask ?? (async () => paymentResponsePayload),
      ),
      fetchOrderDetails: apiMock(
        apiClients.paymentApi.fetchOrderDetails,
        overrides.paymentApi?.fetchOrderDetails ?? (async () => orderDetailsResponsePayload),
      ),
    },
    formBootstrapApi: {
      fetchFormBootstrapForInstance: apiMock(
        apiClients.formBootstrapApi.fetchFormBootstrapForInstance,
        overrides.formBootstrapApi?.fetchFormBootstrapForInstance ?? (async () => getFormBootstrapMock()),
      ),
      fetchFormBootstrapForStateless: apiMock(
        apiClients.formBootstrapApi.fetchFormBootstrapForStateless,
        overrides.formBootstrapApi?.fetchFormBootstrapForStateless ?? (async () => getFormBootstrapMock()),
      ),
    },
    externalApi: {
      fetchExternalApi: apiMock(
        apiClients.externalApi.fetchExternalApi,
        overrides.externalApi?.fetchExternalApi ??
          (async () => {
            throw new Error('Override externalApi.fetchExternalApi in this test');
          }),
      ),
    },
    backendValidationApi: {
      fetchBackendValidations: apiMock(
        apiClients.backendValidationApi.fetchBackendValidations,
        overrides.backendValidationApi?.fetchBackendValidations ?? (async () => []),
      ),
    },
    instanceApi: {
      getInstance: apiMock(
        apiClients.instanceApi.getInstance,
        overrides.instanceApi?.getInstance ?? (async () => getInstanceWithProcessMock()),
      ),
      getActiveInstances: apiMock(
        apiClients.instanceApi.getActiveInstances,
        overrides.instanceApi?.getActiveInstances ?? (async () => []),
      ),
      create: apiMock(
        apiClients.instanceApi.create,
        overrides.instanceApi?.create ?? (async () => getInstanceWithProcessMock()),
      ),
      createWithPrefill: apiMock(
        apiClients.instanceApi.createWithPrefill,
        overrides.instanceApi?.createWithPrefill ?? (async () => getInstanceWithProcessMock()),
      ),
    },
    partyApi: {
      getPartiesAllowedToInstantiateHierarchical: apiMock(
        apiClients.partyApi.getPartiesAllowedToInstantiateHierarchical,
        overrides.partyApi?.getPartiesAllowedToInstantiateHierarchical ?? (async () => [getPartyMock()]),
      ),
      setSelectedParty: apiMock(
        apiClients.partyApi.setSelectedParty,
        overrides.partyApi?.setSelectedParty ??
          (async (): Promise<Awaited<ReturnType<ApiClients['partyApi']['setSelectedParty']>>> =>
            'Party successfully updated'),
      ),
    },
    textResourcesApi: {
      fetchTextResources: apiMock(
        apiClients.textResourcesApi.fetchTextResources,
        overrides.textResourcesApi?.fetchTextResources ?? (async (language) => ({ language, resources: [] })),
      ),
    },
    signingApi: {
      fetchSigneeList: apiMock(
        apiClients.signingApi.fetchSigneeList,
        overrides.signingApi?.fetchSigneeList ?? (async () => []),
      ),
      fetchSigningDocuments: apiMock(
        apiClients.signingApi.fetchSigningDocuments,
        overrides.signingApi?.fetchSigningDocuments ?? (async () => []),
      ),
      fetchAuthorizedOrganizationDetails: apiMock(
        apiClients.signingApi.fetchAuthorizedOrganizationDetails,
        overrides.signingApi?.fetchAuthorizedOrganizationDetails ?? (async () => ({ organizations: [] })),
      ),
    },
    lookupApi: {
      fetchPerson: apiMock(
        apiClients.lookupApi.fetchPerson,
        overrides.lookupApi?.fetchPerson ??
          (async () => {
            throw new Error('Override lookupApi.fetchPerson in this test');
          }),
      ),
      fetchOrg: apiMock(
        apiClients.lookupApi.fetchOrg,
        overrides.lookupApi?.fetchOrg ??
          (async () => {
            throw new Error('Override lookupApi.fetchOrg in this test');
          }),
      ),
    },
  } satisfies ApiClients;
}
