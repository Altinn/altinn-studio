import { axiosInstance } from 'src/core/axiosInstance';
import type { ISimpleInstance } from 'src/types';
import type { IInstance, IProcess } from 'src/types/shared';

interface IInstanceWithProcess extends IInstance {
  process: IProcess;
}

export interface Prefill {
  [key: string]: unknown;
}

export interface InstanceOwner {
  partyId: string | undefined;
}

export interface Instantiation {
  instanceOwner: InstanceOwner;
  prefill: Prefill;
}

export class InstanceApi {
  public static async getInstance({
    instanceOwnerPartyId,
    instanceGuid,
  }: {
    instanceOwnerPartyId: string;
    instanceGuid: string;
  }): Promise<IInstanceWithProcess> {
    const { data: instance } = await axiosInstance.get<IInstanceWithProcess>(
      `/instances/${instanceOwnerPartyId}/${instanceGuid}`,
    );
    return instance;
  }

  public static async getActiveInstances({ partyId }: { partyId: string }): Promise<ISimpleInstance[]> {
    const { data } = await axiosInstance.get<ISimpleInstance[]>(`/instances/${partyId}/active`);
    return data;
  }

  public static async create({
    instanceOwnerPartyId,
    language = 'nb',
  }: {
    instanceOwnerPartyId: number;
    language?: string;
  }): Promise<IInstanceWithProcess> {
    const params = new URLSearchParams({
      instanceOwnerPartyId: String(instanceOwnerPartyId),
      language,
    });
    const { data: createdInstance } = await axiosInstance.post<IInstanceWithProcess>(`/instances?${params}`);
    return createdInstance;
  }

  public static async createWithPrefill({
    data,
    language = 'nb',
  }: {
    data: Instantiation;
    language?: string;
  }): Promise<IInstanceWithProcess> {
    const params = new URLSearchParams({ language });
    const { data: createdInstance } = await axiosInstance.post<IInstanceWithProcess>(
      `/instances/create?${params}`,
      data,
    );
    return createdInstance;
  }
}
