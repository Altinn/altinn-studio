import { getAltinnAppApi } from 'nextsrc/api/generated/endpoints/altinnAppApi';
import type { InstanceResponse } from 'nextsrc/api/generated/model';

export class InstanceApi {
  private static altinnAppApi = getAltinnAppApi();

  public static async create(instanceOwnerPartyId: number, language = 'nb'): Promise<InstanceResponse> {
    return this.altinnAppApi.postInstances({ instanceOwnerPartyId, language });
  }

  public static async getInstance({
    instanceOwnerPartyId,
    instanceGuid,
  }: {
    instanceOwnerPartyId: string;
    instanceGuid: string;
  }): Promise<InstanceResponse> {
    return this.altinnAppApi.getInstancesInstanceOwnerPartyIdInstanceGuid(Number(instanceOwnerPartyId), instanceGuid);
  }
}
