import { axiosInstance } from 'src/core/axiosInstance';
import type { Instantiation } from 'src/features/instantiate/useInstantiation';
import type { ISimpleInstance } from 'src/types';
import type { IInstance } from 'src/types/shared';

export class InstanceApi {
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

  public static async getActiveInstances(partyId: string): Promise<ISimpleInstance[]> {
    const { data } = await axiosInstance.get<ISimpleInstance[]>(`/instances/${partyId}/active`);
    return data;
  }

  public static async create(instanceOwnerPartyId: number, language = 'nb'): Promise<IInstance> {
    const params = new URLSearchParams({
      instanceOwnerPartyId: String(instanceOwnerPartyId),
      language,
    });
    const { data: createdInstance } = await axiosInstance.post<IInstance>(`/instances?${params}`);
    return createdInstance;
  }

  public static async createWithPrefill(data: Instantiation, language = 'nb'): Promise<IInstance> {
    const params = new URLSearchParams({ language });
    const { data: createdInstance } = await axiosInstance.post<IInstance>(`/instances/create?${params}`, data);
    return createdInstance;
  }
}
