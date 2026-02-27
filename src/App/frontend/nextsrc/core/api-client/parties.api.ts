import { getAltinnAppApi } from 'nextsrc/api/generated/endpoints/altinnAppApi';
import { IParty } from 'src/types/shared';

export class PartiesApi {
  private static altinnAppApi = getAltinnAppApi();

  public static async getPartiesAllowedToInstantiateHierarchical(): Promise<IParty[]> {
    return this.altinnAppApi.getApiV1Parties({ allowedToInstantiateFilter: true }) as unknown as IParty[]; // TODO: fix nullable types in backend to use that instead;
  }

  public static async updateSelectedParty(partyId: number) {
    return this.altinnAppApi.putApiV1PartiesPartyId(partyId);
  }
}
