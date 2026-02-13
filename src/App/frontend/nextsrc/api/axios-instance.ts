import axios from 'axios';
import { GlobalData } from 'nextsrc/core/globalData';
import type { AxiosRequestConfig } from 'axios';

const axiosInstance = axios.create({
  baseURL: GlobalData.basename,
});

export const customAxiosInstance = <T>(config: AxiosRequestConfig): Promise<T> =>
  axiosInstance(config).then(({ data }) => data);
