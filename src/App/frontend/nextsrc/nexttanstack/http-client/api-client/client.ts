import axios from 'axios';

/**
 * Get the base path for API calls (/{org}/{app})
 * Extracts org and app from the current URL pathname
 */
const getAppBasePath = (): string => {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length >= 2) {
    return `/${pathParts[0]}/${pathParts[1]}`;
  }
  return '';
};

/**
 * Configured axios instance for API calls
 * Automatically prepends the /{org}/{app} base path to all requests
 */
export const apiClient = axios.create({
  baseURL: getAppBasePath(),
});
