import { getAltinnAppApi } from 'nextsrc/api/generated/endpoints/altinnAppApi';
import type { InstanceResponse } from 'nextsrc/api/generated/model';

import type { ISimpleInstance } from 'src/types';
import type { IInstance, IProcess } from 'src/types/shared';

export class InstanceApi {
  private static altinnAppApi = getAltinnAppApi();

  public static async create(instanceOwnerPartyId: number, language = 'nb'): Promise<InstanceResponse> {
    return this.altinnAppApi.postInstances({ instanceOwnerPartyId, language });
  }
  public static async getActiveInstances(partyId: number): Promise<ISimpleInstance[]> {
    return this.altinnAppApi.getInstancesInstanceOwnerPartyIdActive(partyId) as unknown as ISimpleInstance[]; // TODO: fix nullable types in backend to use that instead
  }

  public static async getInstance({
    instanceOwnerPartyId,
    instanceGuid,
  }: {
    instanceOwnerPartyId: string;
    instanceGuid: string;
  }): Promise<InstanceWithProcess> {
    return this.altinnAppApi.getInstancesInstanceOwnerPartyIdInstanceGuid(
      Number(instanceOwnerPartyId),
      instanceGuid,
    ) as unknown as InstanceWithProcess;
  }
}

type InstanceWithProcess = IInstance & { process: IProcess }; // TODO: fix nullable types in backend to use that instead
