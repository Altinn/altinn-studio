/**
 * This format is used to represent the form data in a flat structure. It has no hierarchy, and it's difficult to
 * work with objects and arrays in this format. Use it when you need direct access to leaf values (e.g. strings),
 * but use the object format when you need to work with objects and arrays.
 */
export interface IFormData {
  [dataFieldKey: string]: string;
}

/**
 * This is the default time (in milliseconds) to wait before debouncing the form data. That means, we'll wait this
 * long before we move the data the user is currently typing into the debouncedCurrentData object. The debounced
 * data is less fresh than currentData, but it's the data we'll use to evaluate expressions, output in text resources,
 * etc. Over time we might migrate to fresher data for these use-cases as well.
 *
 * The amount of time we'll wait before saving the data to the server usually also this value, but it can be
 * configured separately by for example saving the data on page navigation only.
 */
export const DEFAULT_DEBOUNCE_TIMEOUT = 400;
