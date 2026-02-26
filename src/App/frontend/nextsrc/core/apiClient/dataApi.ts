import { axiosInstance } from 'nextsrc/core/axiosInstance';

import type { Operation } from 'fast-json-patch';
import type { IInstance } from 'src/types/shared';

export type FormDataPrimitive = string | number | boolean | null;

export type FormDataNode = FormDataPrimitive | FormDataNode[] | { [key: string]: FormDataNode };

export interface MultiPatchRequest {
  patches: Array<{
    dataElementId: string;
    patch: Operation[];
  }>;
  ignoredValidators: string[];
}

export interface MultiPatchResponse {
  validationIssues: unknown[];
  newDataModels: Array<{
    dataElementId: string;
    data: Record<string, FormDataNode>;
  }>;
  instance: IInstance;
}

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
    const { data } = await axiosInstance.get<FormDataNode>(
      `/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataObjectGuid}?${params}`,
    );
    return data;
  }

  public static async patchFormData({
    instanceOwnerPartyId,
    instanceGuid,
    request,
  }: {
    instanceOwnerPartyId: string;
    instanceGuid: string;
    request: MultiPatchRequest;
  }): Promise<MultiPatchResponse> {
    const { data } = await axiosInstance.patch<MultiPatchResponse>(
      `/instances/${instanceOwnerPartyId}/${instanceGuid}/data`,
      request,
    );
    return data;
  }
}
