import { axiosInstance } from 'nextsrc/core/axiosInstance';

import type { IInstance, IProcess } from 'src/types/shared';

interface IInstanceWithProcess extends IInstance {
  process: IProcess;
}

export class InstanceApi {
  public static async create(partyId: number, language = 'nb'): Promise<IInstanceWithProcess> {
    const params = new URLSearchParams({
      instanceOwnerPartyId: String(partyId),
      language,
    });
    const { data: createdInstance } = await axiosInstance.post<IInstanceWithProcess>(`/instances?${params}`);
    return createdInstance;
  }
}
