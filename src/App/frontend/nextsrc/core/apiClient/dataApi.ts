import { axiosInstance } from 'nextsrc/core/axiosInstance';

type FormDataPrimitive = string | number | boolean | null;

type FormDataNode = FormDataPrimitive | FormDataNode[] | { [key: string]: FormDataNode };

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
  }): Promise<FormDataNode> {
    const params = new URLSearchParams({
      includeRowId: String(includeRowId),
      language,
    });
    const { data: instance } = await axiosInstance.get<FormDataNode>(
      `/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataObjectGuid}?${params}`,
    );
    return instance;
  }
}
