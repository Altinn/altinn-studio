import { axiosInstance } from 'src/core/axiosInstance';
import type { IParty } from 'src/types/shared';

type SetSelectedPartyResponse = 'Party successfully updated' | null;

/** Class for managing party-related API calls to backend */
export class PartyApi {
  public static async getPartiesAllowedToInstantiateHierarchical(): Promise<IParty[]> {
    const { data: parties } = await axiosInstance.get<IParty[]>('/api/v1/parties?allowedtoinstantiatefilter=true');
    return parties;
  }
  public static async setSelectedParty({ partyId }: { partyId: number | string }): Promise<SetSelectedPartyResponse> {
    const { data } = await axiosInstance.put<SetSelectedPartyResponse>(`/api/v1/parties/${partyId}`);
    return data;
  }
}
