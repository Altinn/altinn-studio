import { renderHook } from '@testing-library/react';
import {
  type SupportedStorage,
  type UseOrgAppScopedStorage,
  useOrgAppScopedStorage,
} from '../../../../../../libs/studio-hooks/src/hooks/useOrgAppScopedStorage';
import { useParams } from 'react-router-dom';

jest.mock('react-router-dom', () => ({
  useParams: jest.fn(),
}));

const mockedOrg: string = 'testOrg';
const mockedApp: string = 'testApp';
const scopedStorageKey: string = 'testOrg-testApp';
const storagesToTest: SupportedStorage[] = ['localStorage', 'sessionStorage'];

describe('useOrgAppScopedStorage', () => {
  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it.each(storagesToTest)(
    'initializes ScopedStorageImpl with correct storage scope, %s',
    (storage: SupportedStorage) => {
      const { result } = renderUseOrgAppScopedStorage({ storage });

      result.current.setItem('key', 'value');

      expect(result.current.setItem).toBeDefined();
      expect(result.current.getItem).toBeDefined();
      expect(result.current.removeItem).toBeDefined();
      expect(window[storage].getItem(scopedStorageKey)).toBe('{"key":"value"}');
    },
  );

  it.each(storagesToTest)('should retrieve parsed objects from %s', (storage) => {
    const { result } = renderUseOrgAppScopedStorage({ storage });

    result.current.setItem('person', { name: 'John', age: 18 });

    expect(result.current.getItem('person')).toEqual({
      name: 'John',
      age: 18,
    });
  });

  it.each(storagesToTest)('should be possible to remove item from %s', (storage) => {
    const { result } = renderUseOrgAppScopedStorage({ storage });

    result.current.setItem('key', 'value');
    result.current.removeItem('key');
    expect(result.current.getItem('key')).toBeUndefined();
  });

  it('should use localStorage as default storage', () => {
    const { result } = renderUseOrgAppScopedStorage({});
    result.current.setItem('key', 'value');

    expect(window.localStorage.getItem(scopedStorageKey)).toBe('{"key":"value"}');
  });
});

const renderUseOrgAppScopedStorage = ({ storage }: UseOrgAppScopedStorage) => {
  (useParams as jest.Mock).mockReturnValue({ org: mockedOrg, app: mockedApp });
  const { result } = renderHook(() =>
    useOrgAppScopedStorage({
      storage,
    }),
  );
  return { result };
};
