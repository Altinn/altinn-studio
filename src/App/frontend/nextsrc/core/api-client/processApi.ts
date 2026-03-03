import { axiosInstance } from 'nextsrc/core/axiosInstance';

import type { IProcess } from 'src/types/shared';

export class ProcessApi {
  public static async getProcessState({
    instanceOwnerPartyId,
    instanceGuid,
  }: {
    instanceOwnerPartyId: string;
    instanceGuid: string;
  }): Promise<IProcess> {
    const { data } = await axiosInstance.get<IProcess>(
      `/instances/${instanceOwnerPartyId}/${instanceGuid}/process`,
    );
    return data;
  }

  public static async processNext({
    instanceOwnerPartyId,
    instanceGuid,
    action,
    language,
  }: {
    instanceOwnerPartyId: string;
    instanceGuid: string;
    action?: string;
    language?: string;
  }): Promise<IProcess> {
    const params = new URLSearchParams();
    if (action) {
      params.set('action', action);
    }
    if (language) {
      params.set('language', language);
    }
    const query = params.toString();
    const url = `/instances/${instanceOwnerPartyId}/${instanceGuid}/process/next${query ? `?${query}` : ''}`;
    const { data } = await axiosInstance.put<IProcess>(url);
    return data;
  }
}
