import axios from 'axios';

import { GlobalData } from 'src/GlobalData';

export const axiosInstance = axios.create({
  baseURL: GlobalData.basename,
});
