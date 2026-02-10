import { axiosInstance } from 'nextsrc/core/axiosInstance';

import type { IParty } from 'src/types/shared';

export class PartiesApi {
  public static async getPartiesAllowedToInstantiate() {
    const parties = await axiosInstance
      .get<IParty[]>('/api/v1/parties?allowedtoinstantiatefilter=true')
      .then((response) => response.data);

    // Flatten retrieved parties to also show child parties
    // TODO: Should this be done on the backend?
    const result: IParty[] = [];
    const stack = [...parties];

    while (stack.length) {
      const current = stack.pop();
      if (current) {
        result.push(current);
        if (current.childParties) {
          stack.push(...current.childParties);
        }
      }
    }

    return result;
  }
}
