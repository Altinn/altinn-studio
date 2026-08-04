import type { AxiosResponse } from 'axios';

import { axiosInstance } from 'src/core/axiosInstance';
import type { IDataList } from 'src/features/dataLists';
import type { IRawOption } from 'src/layout/common.generated';

type OptionsResponse = {
  data: IRawOption[];
  headers: AxiosResponse['headers'];
};

export interface OptionsApi {
  getOptions(url: string): Promise<OptionsResponse>;
  getDataList(url: string): Promise<IDataList>;
}

export const optionsApi: OptionsApi = {
  async getOptions(url) {
    const response = await axiosInstance.get<IRawOption[]>(url);
    return { data: response.data, headers: response.headers };
  },

  async getDataList(url) {
    const response = await axiosInstance.get<IDataList>(url);
    return response.data;
  },
};
