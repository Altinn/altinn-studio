import { axiosInstance } from 'nextsrc/core/axiosInstance';

import type { IInstance, IProcess } from 'src/types/shared';

interface IInstanceWithProcess extends IInstance {
  process: IProcess;
}

export class InstanceApi {
  public static async create(instanceOwnerPartyId: number, language = 'nb'): Promise<IInstanceWithProcess> {
    const params = new URLSearchParams({
      instanceOwnerPartyId: String(instanceOwnerPartyId),
      language,
    });
    const { data: createdInstance } = await axiosInstance.post<IInstanceWithProcess>(`/instances?${params}`);
    return createdInstance;
  }
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
}
