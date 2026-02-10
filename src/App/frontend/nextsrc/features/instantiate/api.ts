import { axiosInstance } from 'nextsrc/core/axiosInstance';

import type { IInstance, IParty, IProcess } from 'src/types/shared';

interface IInstanceWithProcess extends IInstance {
  process: IProcess;
}

export class InstanceApi {
  public static async create(partyId: number, language = 'nb'): Promise<IInstanceWithProcess> {
    const params = new URLSearchParams({
      instanceOwnerPartyId: String(partyId),
      language,
    });
    const { data } = await axiosInstance.post<IInstanceWithProcess>(`/instances?${params}`);
    return data;
  }

  public static async getPartiesAllowedToInstantiate() {
    try {
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
    } catch (error) {
      // TODO: do something else? Only log in dev mode.*
      // eslint-disable-next-line no-console
      console.log('Fetching parties failed:\n', error);
    }
  }
}
