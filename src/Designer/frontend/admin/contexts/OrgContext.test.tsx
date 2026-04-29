import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { OrgContext, useCurrentOrg } from './OrgContext';
import type { Organization } from 'app-shared/types/Organization';

const orgMock: Organization = { username: 'ttd', full_name: 'Test org', avatar_url: '', id: 1 };

describe('useCurrentOrg', () => {
  it('returns the current org when provided via context', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <OrgContext.Provider value={orgMock}>{children}</OrgContext.Provider>
    );
    const { result } = renderHook(() => useCurrentOrg(), { wrapper });
    expect(result.current).toBe(orgMock);
  });

  it('throws when called outside of OrgContext', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useCurrentOrg())).toThrow('Current org is not defined');
    consoleSpy.mockRestore();
  });
});
