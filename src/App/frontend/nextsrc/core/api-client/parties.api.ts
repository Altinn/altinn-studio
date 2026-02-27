import { getAltinnAppApi } from 'nextsrc/api/generated/endpoints/altinnAppApi';
import { Party } from 'nextsrc/api/generated/model/party';

export class PartiesApi {
  private static altinnAppApi = getAltinnAppApi();

  public static async getPartiesAllowedToInstantiateHierarchical(): Promise<Party[]> {
    return this.altinnAppApi.getApiV1Parties({ allowedToInstantiateFilter: true });
  }

  public static async updateSelectedParty(partyId: number) {
    return this.altinnAppApi.putApiV1PartiesPartyId(partyId);
  }
}
