/**
 * Convert any object to string
 * @param data The object to convert to string
 * @returns The stringified object in JSON format if applicable, otherwise the stringified object
 */
export const stringifyData = (data: any): string => {
  try {
    // Implies during editing and when the expression has not been able to be parsed to JSON due to syntax
    if (typeof data === 'string') return data;
    // Attempt to format the JSON input
    return JSON.stringify(data);
  } catch (error) {
    return data.toString();
  }
};
