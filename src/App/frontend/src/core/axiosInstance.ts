import axios from 'axios';

import { GlobalData } from 'src/GlobalData';

export const axiosInstance = axios.create({
  baseURL: GlobalData.basename,
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    window.logError('Axios request failed:\n', error);
    return Promise.reject(error);
  },
);
