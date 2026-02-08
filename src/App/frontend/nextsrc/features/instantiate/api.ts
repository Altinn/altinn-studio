import { apiClient } from 'nextsrc/core/api';

import type { IInstance } from 'src/types/shared';

export class InstanceApi {
  public static async create(partyId: number, language = 'nb'): Promise<IInstance> {
    const params = new URLSearchParams({
      instanceOwnerPartyId: String(partyId),
      language,
    });
    const { data } = await apiClient.post<IInstance>(`/instances?${params}`);
    return data;
  }
}
