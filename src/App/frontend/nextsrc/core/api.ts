import axios from 'axios';
import { GlobalData } from 'nextsrc/core/globalData';

export const apiClient = axios.create({
  baseURL: GlobalData.basename,
});
