import { waitFor } from '@testing-library/react';
import { queriesMock } from '../../mocks/queriesMock';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { org } from '@studio/testing/testids';
import { useOrgTextLanguagesQuery } from 'app-shared/hooks/queries/useOrgTextLanguagesQuery';

describe('useOrgTextLanguagesQuery', () => {
  it('calls useOrgTextLanguages with the correct parameters', () => {
    render();
    expect(queriesMock.getOrgTextLanguages).toHaveBeenCalledWith(org);
  });
});

const render = async () => {
  const { result } = renderHookWithProviders(() => useOrgTextLanguagesQuery(org));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return result;
};
