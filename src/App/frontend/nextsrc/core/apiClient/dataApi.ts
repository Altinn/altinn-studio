import { axiosInstance } from 'nextsrc/core/axiosInstance';

type FormDataPrimitive = string | number | boolean | null;

export type FormData = FormDataPrimitive | FormData[] | { [key: string]: FormData };

export class DataApi {
  public static async getDataObject({
    instanceOwnerPartyId,
    instanceGuid,
    dataObjectGuid,
    includeRowId = true,
    language = 'nb',
  }: {
    instanceOwnerPartyId: string;
    instanceGuid: string;
    dataObjectGuid: string;
    includeRowId?: boolean;
    language?: string;
  }): Promise<FormData> {
    const params = new URLSearchParams({
      includeRowId: String(includeRowId),
      language,
    });
    const { data: instance } = await axiosInstance.get<FormData>(
      `/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataObjectGuid}?${params}`,
    );
    return instance;
  }
}
