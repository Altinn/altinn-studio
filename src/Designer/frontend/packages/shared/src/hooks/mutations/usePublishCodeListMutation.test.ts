import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { usePublishCodeListMutation } from '../../hooks/mutations/usePublishCodeListMutation';
import type { PublishCodeListPayload } from '../../types/api/PublishCodeListPayload';

// Test data:
const org = 'test-org';

describe('usePublishCodeListMutation', () => {
  it('Calls publishCodeList with correct arguments and payload', async () => {
    const publishCodeList = jest.fn();
    const { result } = renderHookWithProviders(() => usePublishCodeListMutation(org), {
      queries: { publishCodeList },
    });
    const payload: PublishCodeListPayload = {
      title: 'Test Code List',
      codeList: {
        codes: [
          { value: '001', label: { nb: 'En' } },
          { value: '002', label: { nb: 'To' } },
        ],
      },
    };

    await result.current.mutateAsync(payload);

    expect(publishCodeList).toHaveBeenCalledTimes(1);
    expect(publishCodeList).toHaveBeenCalledWith(org, payload);
  });
});
