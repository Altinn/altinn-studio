import { getAltinnAppApi } from 'nextsrc/api/generated/endpoints/altinnAppApi';
import type { Party } from 'nextsrc/api/generated/model';

export class PartiesApi {
  private static altinnAppApi = getAltinnAppApi();

  public static async getPartiesAllowedToInstantiate(): Promise<Party[]> {
    const parties = await this.altinnAppApi.getApiV1Parties({ allowedToInstantiateFilter: true });

    // Flatten retrieved parties to also show child parties
    // TODO: Should this be done on the backend?
    const flattenedParties: Party[] = [];
    const stack = [...parties];

    while (stack.length) {
      const current = stack.pop();
      if (current) {
        flattenedParties.push(current);
        if (current.childParties) {
          stack.push(...current.childParties);
        }
      }
    }

    return flattenedParties;
  }
}
