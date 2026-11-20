import { appClient } from 'src/core/httpClient';
import type { IParty } from 'src/types/shared';

export type SetSelectedPartyResponse = 'Party successfully updated' | null;

/** API client object for party-related calls to backend */
export const partyApi = {
  async getPartiesAllowedToInstantiateHierarchical(): Promise<IParty[]> {
    const { data: parties } = await appClient.get<IParty[]>('/api/v1/parties?allowedtoinstantiatefilter=true');
    return parties;
  },

  async setSelectedParty({ partyId }: { partyId: number | string }): Promise<SetSelectedPartyResponse> {
    const { data } = await appClient.put<SetSelectedPartyResponse>(`/api/v1/parties/${partyId}`);
    return data;
  },
};

export type PartyApi = typeof partyApi;
