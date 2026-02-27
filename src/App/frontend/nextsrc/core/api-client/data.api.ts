import { getAltinnAppApi } from 'nextsrc/api/generated/endpoints/altinnAppApi';

export type FormDataPrimitive = string | number | boolean | null;

export type FormDataNode = FormDataPrimitive | FormDataNode[] | { [key: string]: FormDataNode };

export class DataApi {
  private static altinnAppApi = getAltinnAppApi();

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
    return this.altinnAppApi.getInstancesInstanceOwnerPartyIdInstanceGuidDataDataGuid(
      Number(instanceOwnerPartyId),
      instanceGuid,
      dataObjectGuid,
      { includeRowId, language },
    ) as unknown as FormDataNode;
  }
}
