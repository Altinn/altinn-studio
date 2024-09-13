import axios from 'axios';
import type { AppFrontendVersion } from './version';
import { versionSettings } from './version';

// Fetches the complete layout schema for the specified version of App Frontend. Defaults to v4.
export const getLayoutSchema = async (version?: AppFrontendVersion) => {
  const response = await axios.get(versionSettings[version || 'v4'].layoutSchemaUrl);
  return response?.data;
};

export const getExpressionSchema = async (version?: AppFrontendVersion) => {
  const response = await axios.get(versionSettings[version || 'v4'].expressionSchemaUrl);
  return response?.data;
};
