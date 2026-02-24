import { queryOptions } from '@tanstack/react-query';

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

  public static async getPartiesAllowedToInstantiateHierarchical() {
    return axiosInstance
      .get<IParty[]>('/api/v1/parties?allowedtoinstantiatefilter=true')
      .then((response) => response.data);
  }

  public static async setSelectedParty(partyId: number) {
    return axiosInstance.put<string | null>(`/api/v1/parties/${partyId}`).then((response) => response.data);
  }
}

export const partiesAllowedToInstantiateQuery = queryOptions({
  queryKey: ['parties', 'allowedToInstantiate'],
  queryFn: () => PartiesApi.getPartiesAllowedToInstantiate(),
  staleTime: 1000 * 60,
});

export const partiesAllowedToInstantiateHierarchicalQuery = queryOptions({
  queryKey: ['parties', 'allowedToInstantiateHierarchical'],
  queryFn: () => PartiesApi.getPartiesAllowedToInstantiateHierarchical(),
  staleTime: 1000 * 60,
});
