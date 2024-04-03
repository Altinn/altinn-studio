import { renderHook } from '@testing-library/react';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

// Test data:
const org = 'test-org';
const app = 'test-app';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ org, app }),
}));

describe('useStudioUrlParams', () => {
  it('Returns the org and app names from the URL', () => {
    const { result } = renderHook(() => useStudioUrlParams());
    expect(result.current).toEqual({ org, app });
  });
});
