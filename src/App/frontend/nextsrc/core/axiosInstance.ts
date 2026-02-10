import axios from 'axios';
import { GlobalData } from 'nextsrc/core/globalData';

export const axiosInstance = axios.create({
  baseURL: GlobalData.basename,
});
