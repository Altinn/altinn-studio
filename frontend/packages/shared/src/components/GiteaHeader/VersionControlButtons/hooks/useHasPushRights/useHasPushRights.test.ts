import { renderHook } from '@testing-library/react';
import { useHasPushRights } from './useHasPushRights';
import { type Repository } from 'app-shared/types/Repository';
import { repository } from 'app-shared/mocks/mocks';

describe('useHasPushRights', () => {
  afterEach(jest.clearAllMocks);

  it('should set hasPushRights to true when currentRepo.permissions.push is true', () => {
    const currentRepo: Repository = {
      ...repository,
      permissions: { ...repository.permissions, push: true },
    };
    const { result } = renderHook(() => useHasPushRights(currentRepo));
    expect(result.current).toBe(true);
  });

  it('should set hasPushRights to false when currentRepo.permissions.push is false', () => {
    const currentRepo: Repository = {
      ...repository,
      permissions: { ...repository.permissions, push: false },
    };
    const { result } = renderHook(() => useHasPushRights(currentRepo));

    expect(result.current).toBe(false);
  });

  it('should update hasPushRights when currentRepo changes', () => {
    let currentRepo: Repository = {
      ...repository,
      permissions: { ...repository.permissions, push: false },
    };
    const { result, rerender } = renderHook(() => useHasPushRights(currentRepo));

    expect(result.current).toBe(false);

    currentRepo = {
      ...repository,
      permissions: { ...repository.permissions, push: true },
    };
    rerender();

    expect(result.current).toBe(true);
  });
});
