import { type ScopedStorage, ScopedStorageImpl } from './ScopedStorage';

describe('ScopedStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('add new key', () => {
    it('should create a single scoped key with the provided key-value pair as its value', () => {
      const scopedStorage = new ScopedStorageImpl(window.localStorage, 'unit/test');
      scopedStorage.setItem('firstName', 'Random Value');
      expect(scopedStorage.getItem('firstName')).toBe('Random Value');
    });
  });

  describe('get item', () => {
    it('should return "null" if key does not exist', () => {
      const scopedStorage = new ScopedStorageImpl(window.localStorage, 'unit/test');
      expect(scopedStorage.getItem('firstName')).toBeNull();
    });
  });

  describe('update existing key', () => {
    it('should append a new key-value pair to the existing scoped key', () => {
      const scopedStorage = new ScopedStorageImpl(window.localStorage, 'unit/test');
      scopedStorage.setItem('firstKey', 'first value');
      scopedStorage.setItem('secondKey', 'secondValue');

      expect(scopedStorage.getItem('firstKey')).toBe('first value');
      expect(scopedStorage.getItem('secondKey')).toBe('secondValue');
    });

    it('should update the value of an existing key-value pair within the scoped key if the value has changed', () => {
      const scopedStorage = new ScopedStorageImpl(window.localStorage, 'unit/test');
      scopedStorage.setItem('firstKey', 'first value');
      scopedStorage.setItem('firstKey', 'first value is updated');
      expect(scopedStorage.getItem('firstKey')).toBe('first value is updated');
    });
  });

  describe('delete values from key', () => {
    it('should remove a specific key-value pair from the existing scoped key', () => {
      const scopedStorage = new ScopedStorageImpl(window.localStorage, 'unit/test');
      scopedStorage.setItem('firstKey', 'first value');
      expect(scopedStorage.getItem('firstKey')).toBeDefined();

      scopedStorage.removeItem('firstKey');
      expect(scopedStorage.getItem('firstKey')).toBeUndefined();
    });

    it('should not remove key if it does not exist', () => {
      const removeItemMock = jest.fn();
      const customStorage = {
        getItem: jest.fn().mockImplementation(() => null),
        removeItem: removeItemMock,
        setItem: jest.fn(),
      };

      const scopedStorage = new ScopedStorageImpl(customStorage, 'unit/test');
      scopedStorage.removeItem('keyDoesNotExist');

      expect(removeItemMock).not.toHaveBeenCalled();
    });
  });

  describe('Storage parsing', () => {
    const consoleErrorMock = jest.fn();
    const originalConsoleError = console.error;
    beforeEach(() => {
      console.error = consoleErrorMock;
    });

    afterEach(() => {
      console.error = originalConsoleError;
    });

    it('should console.error when parsing the storage fails', () => {
      window.localStorage.setItem('unit/test', '{"person";{"name":"tester"}}');
      const scopedStorage = new ScopedStorageImpl(window.localStorage, 'unit/test');
      expect(scopedStorage.getItem('person')).toBeNull();
      expect(consoleErrorMock).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to parse storage with key unit/test. Ensure that the storage is a valid JSON string. Error: SyntaxError:',
        ),
      );
    });
  });

  // Verify that Dependency Inversion works as expected
  describe('when using localStorage', () => {
    it('should store and retrieve values using localStorage', () => {
      const scopedStorage = new ScopedStorageImpl(window.sessionStorage, 'local/storage');
      scopedStorage.setItem('firstNameInSession', 'Random Session Value');
      expect(scopedStorage.getItem('firstNameInSession')).toBe('Random Session Value');
    });
  });

  describe('when using sessionStorage', () => {
    it('should store and retrieve values using sessionStorage', () => {
      const scopedStorage = new ScopedStorageImpl(window.sessionStorage, 'session/storage');
      scopedStorage.setItem('firstNameInSession', 'Random Session Value');
      expect(scopedStorage.getItem('firstNameInSession')).toBe('Random Session Value');
    });
  });

  describe('when using a custom storage implementation', () => {
    it('should store and retrieve values using the provided custom storage', () => {
      const setItemMock = jest.fn();

      const customStorage: ScopedStorage = {
        setItem: setItemMock,
        getItem: jest.fn(),
        removeItem: jest.fn(),
      };

      const scopedStorage = new ScopedStorageImpl(customStorage, 'unit/test');
      scopedStorage.setItem('testKey', 'testValue');
      expect(setItemMock).toHaveBeenCalledWith('unit/test', '{"testKey":"testValue"}');
    });
  });
});
