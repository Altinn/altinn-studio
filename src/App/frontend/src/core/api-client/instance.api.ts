import { axiosInstance } from 'src/core/axiosInstance';
import type { ISimpleInstance } from 'src/types';
import type { IInstance } from 'src/types/shared';

export interface InstantiationPrefillData {
  instanceOwner: { partyId: string | undefined };
  prefill: { [key: string]: unknown };
}

export class InstanceApi {
  public static async create(instanceOwnerPartyId: number, language = 'nb'): Promise<IInstance> {
    const params = new URLSearchParams({
      instanceOwnerPartyId: String(instanceOwnerPartyId),
      language,
    });
    const { data: createdInstance } = await axiosInstance.post<IInstance>(`/instances?${params}`);
    return createdInstance;
  }

  public static async createWithPrefill(data: InstantiationPrefillData, language?: string): Promise<IInstance> {
    const params = language ? new URLSearchParams({ language }) : undefined;
    const url = params ? `/instances/create?${params}` : '/instances/create';
    const { data: createdInstance } = await axiosInstance.post<IInstance>(url, data);
    return createdInstance;
  }

  public static async getActiveInstances(partyId: number): Promise<ISimpleInstance[]> {
    const { data } = await axiosInstance.get<ISimpleInstance[]>(`/instances/${partyId}/active`);
    return data;
  }

  public static async getInstance({
    instanceOwnerPartyId,
    instanceGuid,
  }: {
    instanceOwnerPartyId: string;
    instanceGuid: string;
  }): Promise<IInstance> {
    const { data: instance } = await axiosInstance.get<IInstance>(`/instances/${instanceOwnerPartyId}/${instanceGuid}`);
    return instance;
  }
}
