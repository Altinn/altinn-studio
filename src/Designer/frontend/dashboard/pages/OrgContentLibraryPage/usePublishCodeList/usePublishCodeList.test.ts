import { usePublishCodeList } from './usePublishCodeList';
import { renderHookWithProviders } from '../../../testing/mocks';
import type { PublishCodeListPayload } from 'app-shared/types/api/PublishCodeListPayload';
import { waitFor } from '@testing-library/react';

// Test data:
const orgName = 'test-org';
const title = 'Test code list';
const payload: PublishCodeListPayload = {
  title,
  codeList: {
    codes: [
      { value: '001', label: { nb: 'En', en: 'One' } },
      { value: '002', label: { nb: 'To', en: 'Two' } },
    ],
  },
};

describe('usePublishCodeList', () => {
  it('Returns a function that publishes a given code list', async () => {
    const publishCodeList = jest.fn();
    const { result } = renderHookWithProviders(() => usePublishCodeList(orgName), {
      queries: { publishCodeList },
    });

    result.current.publish(payload);
    await waitFor(expect(publishCodeList).toHaveBeenCalled);

    expect(publishCodeList).toHaveBeenCalledTimes(1);
    expect(publishCodeList).toHaveBeenCalledWith(orgName, payload);
  });

  test('isPublishing returns the current publishing state of the code list with the given name', async () => {
    const publishCodeList = jest.fn();
    const resolvePublish = jest.fn();
    const { result } = renderHookWithProviders(() => usePublishCodeList(orgName), {
      queries: { publishCodeList },
    });

    publishCodeList.mockImplementation(async () => {
      await waitFor(() => expect(result.current.isPublishing(title)).toBe(true)); // The assertion must be done inside the mock to capture the state during publishing
      resolvePublish();
    });
    expect(result.current.isPublishing(title)).toBe(false);
    result.current.publish(payload);
    await waitFor(expect(publishCodeList).toHaveBeenCalled);
    await waitFor(expect(resolvePublish).toHaveBeenCalled);
    expect(result.current.isPublishing(title)).toBe(false);
  });

  test('isPublishing returns false when called during publishing, but with the name of another code list', async () => {
    const publishCodeList = jest.fn();
    const resolvePublish = jest.fn();
    const { result } = renderHookWithProviders(() => usePublishCodeList(orgName), {
      queries: { publishCodeList },
    });

    publishCodeList.mockImplementation(async () => {
      await waitFor(() => expect(result.current.isPublishing(title)).toBe(true));
      expect(result.current.isPublishing('Another code list')).toBe(false);
      resolvePublish();
    });
    result.current.publish(payload);
    await waitFor(expect(publishCodeList).toHaveBeenCalled);
    await waitFor(expect(resolvePublish).toHaveBeenCalled);
  });
});
