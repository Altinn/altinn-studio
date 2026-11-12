/*
 * Utils for interacting with the browser's storage API with type safety.
 * This abstract the needs to manually serialize and deserialize values.
 */
export type TypedStorage = {
  setItem: <T>(key: string, value?: T) => void;
  getItem: <T>(key: string) => T | null | undefined;
  removeItem: (key: string) => void;
};

type WebStorage = Pick<Storage, 'setItem' | 'getItem' | 'removeItem'>;

const createWebStorage = (storage: WebStorage): TypedStorage => {
  if (!storage) {
    console.warn('Storage API not available. The browser might not support the provided storage.');
  }

  const removeItem = (key: string): void => storage.removeItem(key);

  return {
    setItem: <T>(key: string, value: T): void => {
      if (value !== undefined) storage.setItem(key, JSON.stringify(value));
    },
    getItem: <T>(key: string): T | null | undefined => {
      const storedItem = storage.getItem(key);
      if (!storedItem) {
        return null;
      }

      try {
        return JSON.parse(storedItem) as T;
      } catch (error) {
        console.warn(
          `Failed to parse stored item with key ${key}. Ensure that the item is a valid JSON string. Error: ${error}`,
        );
        removeItem(key);
      }
    },
    removeItem,
  };
};

export const typedLocalStorage = createWebStorage(window?.localStorage);
export const typedSessionStorage = createWebStorage(window?.sessionStorage);
