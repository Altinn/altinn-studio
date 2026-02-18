import { axiosInstance } from 'nextsrc/core/axiosInstance';

import type { IParty } from 'src/types/shared';

export class PartiesApi {
  public static async getPartiesAllowedToInstantiateHierarchical() {
    return axiosInstance
      .get<IParty[]>('/api/v1/parties?allowedtoinstantiatefilter=true')
      .then((response) => response.data);
  }

  public static async setSelectedParty(partyId: number) {
    return axiosInstance.put<string | null>(`/api/v1/parties/${partyId}`).then((response) => response.data);
  }

  public static async updateSelectedParty(selectedPartyId: string) {
    return axiosInstance.put(`/api/v1/parties/${selectedPartyId}`);
  }
}
