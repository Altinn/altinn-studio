import { describe, expect, it, vi } from 'vitest';
import { get } from 'app-shared/utils/networking';
import type * as Networking from 'app-shared/utils/networking';
import { getAdminResource } from './getAdminResource';

vi.mock('app-shared/utils/networking', async (importOriginal) => ({
  ...(await importOriginal<typeof Networking>()),
  get: vi.fn(),
}));

describe('getAdminResource', () => {
  it('returns the body', async () => {
    vi.mocked(get).mockResolvedValue({ id: 1 });
    await expect(getAdminResource('/admin/resource')).resolves.toEqual({ id: 1 });
  });

  it('throws when the body is empty', async () => {
    vi.mocked(get).mockResolvedValue(null);
    await expect(getAdminResource('/admin/resource')).rejects.toThrow(
      'Expected a body from /admin/resource, got none',
    );
  });
});
