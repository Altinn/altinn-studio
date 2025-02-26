import { renderHookWithProviders } from 'dashboard/testing/mocks';
import { useLocalReposSort } from './useLocalReposSort';
import {
  mockRepos,
  mockReposWithInvalidDate,
  mockReposWithoutFullName,
} from './__mocks__/mockRepos';
import { typedLocalStorage } from '@studio/pure-functions';
import { waitFor } from '@testing-library/react';

jest.mock('@studio/pure-functions', () => ({
  typedLocalStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

describe('useLocalReposSort', () => {
  const storageKey = 'test-sort-preference';

  beforeEach(() => {
    jest.clearAllMocks();
    (typedLocalStorage.getItem as jest.Mock).mockReturnValue(null);
  });

  it('should return empty array when repos is undefined', () => {
    const { result } = renderHookWithProviders(() =>
      useLocalReposSort({ repos: undefined, storageKey }),
    );
    expect(result.current.sortedRepos).toEqual([]);
  });

  it('should sort repos by name in ascending order by default', () => {
    const { result } = renderHookWithProviders(() =>
      useLocalReposSort({ repos: mockRepos, storageKey }),
    );

    expect(result.current.sortedRepos[0].name).toBe('repo-a');
    expect(result.current.sortedRepos[1].name).toBe('repo-b');
    expect(result.current.sortKey).toBe('name');
    expect(result.current.sortDirection).toBe('asc');
  });

  it('should use saved sort preference from localStorage', () => {
    (typedLocalStorage.getItem as jest.Mock).mockReturnValue({
      column: 'updated',
      direction: 'desc',
    });

    const { result } = renderHookWithProviders(() =>
      useLocalReposSort({ repos: mockRepos, storageKey }),
    );

    expect(result.current.sortKey).toBe('updated');
    expect(result.current.sortDirection).toBe('desc');
  });

  it('should handle sort click on same column by toggling direction', async () => {
    const { result } = renderHookWithProviders(() =>
      useLocalReposSort({ repos: mockRepos, storageKey }),
    );

    await waitFor(() => result.current.handleSortClick('name'));
    await waitFor(() => expect(result.current.sortDirection).toBe('desc'));

    await waitFor(() => result.current.handleSortClick('name'));
    await waitFor(() => expect(result.current.sortDirection).toBe('asc'));
  });

  it('should handle sort click on different column by setting asc direction', async () => {
    const { result } = renderHookWithProviders(() =>
      useLocalReposSort({ repos: mockRepos, storageKey }),
    );

    await waitFor(() => result.current.handleSortClick('updated'));
    await waitFor(() => expect(result.current.sortKey).toBe('updated'));
    await waitFor(() => expect(result.current.sortDirection).toBe('asc'));
  });

  it('should handle repos with invalid dates', () => {
    const { result } = renderHookWithProviders(() =>
      useLocalReposSort({ repos: mockReposWithInvalidDate, storageKey, defaultSortKey: 'updated' }),
    );

    expect(result.current.sortedRepos).toBeDefined();
  });

  it('should handle repos without owner full name', () => {
    const { result } = renderHookWithProviders(() =>
      useLocalReposSort({
        repos: mockReposWithoutFullName,
        storageKey,
        defaultSortKey: 'createdBy',
      }),
    );

    expect(result.current.sortedRepos).toBeDefined();
  });

  it('should persist sort preferences to localStorage', async () => {
    const { result } = renderHookWithProviders(() =>
      useLocalReposSort({ repos: mockRepos, storageKey }),
    );

    await waitFor(() => result.current.handleSortClick('name'));
    await waitFor(() =>
      expect(typedLocalStorage.setItem).toHaveBeenCalledWith(storageKey, {
        column: 'name',
        direction: 'desc',
      }),
    );
  });

  it('should cycle through sort directions', async () => {
    const { result } = renderHookWithProviders(() =>
      useLocalReposSort({ repos: mockRepos, storageKey }),
    );

    await waitFor(() => result.current.handleSortClick('name'));
    await waitFor(() => expect(result.current.sortDirection).toBe('desc'));

    await waitFor(() => result.current.handleSortClick('name'));
    await waitFor(() => expect(result.current.sortDirection).toBe('asc'));
  });
});
