import { useParams } from 'react-router';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { MutationFunctionContext, QueryClient, UseMutationOptions } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useProfile } from 'src/features/profile/ProfileProvider';
import { NotificationStatus } from 'src/layout/SigneeList/api';
import { useSigningMutation } from 'src/layout/SigningActions/api';
import { httpPost } from 'src/utils/network/sharedNetworking';
import { appPath } from 'src/utils/urls/appUrlHelper';
import type { SigneeState } from 'src/layout/SigneeList/api';

vi.mock('react-router');
vi.mock('src/features/language/LanguageProvider', () => ({ useCurrentLanguage: vi.fn() }));
vi.mock('src/features/profile/ProfileProvider');
vi.mock('src/utils/network/sharedNetworking');
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useMutation: vi.fn(),
  useQuery: vi.fn(),
  useQueryClient: vi.fn(),
}));

const instanceGuid = '00000000-0000-4000-8000-000000000000';
const partyId = '40003';
const taskId = 'Task_2';
const orgNumber = '910000000';
const currentUserPartyId = 123;
const orgPartyId = 456;
const signedTime = '2026-09-02T10:00:00.000Z';

function signee(partyId: number, signedTime: string | null): SigneeState {
  return {
    name: 'Jane Doe',
    organization: null,
    signedTime,
    hasSigned: !!signedTime,
    delegationSuccessful: true,
    notificationStatus: NotificationStatus.Sent,
    partyId,
  };
}

const unsigned = [signee(currentUserPartyId, null), signee(orgPartyId, null)];
const userSigned = [signee(currentUserPartyId, signedTime), signee(orgPartyId, null)];
const orgSigned = [signee(currentUserPartyId, null), signee(orgPartyId, signedTime)];

describe('useSigningMutation', () => {
  const fetchQuery = vi.fn();
  const invalidateQueries = vi.fn();
  const queryClient = { fetchQuery, invalidateQueries } as unknown as QueryClient;
  const context: MutationFunctionContext = { client: queryClient, meta: undefined };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();

    vi.mocked(useParams).mockReturnValue({ instanceOwnerPartyId: partyId, instanceGuid, taskId });
    vi.mocked(useCurrentLanguage).mockReturnValue('nb');
    vi.mocked(useProfile).mockReturnValue({ partyId: currentUserPartyId } as unknown as ReturnType<typeof useProfile>);
    vi.mocked(useQuery).mockReturnValue({
      data: { organizations: [{ orgNumber, orgName: 'Acme', partyId: orgPartyId }] },
    } as unknown as ReturnType<typeof useQuery>);
    vi.mocked(useQueryClient).mockReturnValue(queryClient);
    vi.mocked(useMutation).mockReturnValue({} as unknown as ReturnType<typeof useMutation>);
    vi.mocked(httpPost).mockResolvedValue({ status: 202, data: '' } as AxiosResponse);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderMutationOptions() {
    renderHook(() => useSigningMutation());
    const [options] = vi.mocked(useMutation).mock.calls.at(-1) ?? [];
    if (!options?.mutationFn) {
      throw new Error('Expected useMutation to receive a mutationFn');
    }
    return options as UseMutationOptions<void, Error, string | null>;
  }

  function sign(onBehalfOf: string | null) {
    const { mutationFn } = renderMutationOptions();
    const result = mutationFn!(onBehalfOf, context);
    result.catch(() => undefined);
    return result;
  }

  it('posts to signing/sign as the current user and resolves once the signature is visible', async () => {
    fetchQuery.mockResolvedValue(userSigned);

    const result = sign(null);
    await vi.advanceTimersByTimeAsync(2000);
    await result;

    expect(httpPost).toHaveBeenCalledTimes(1);
    expect(httpPost).toHaveBeenCalledWith(
      `${appPath}/instances/${partyId}/${instanceGuid}/signing/sign?language=nb`,
      undefined,
    );
    expect(fetchQuery).toHaveBeenCalledTimes(1);
    expect(fetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['signing', 'signeeList', partyId, instanceGuid, taskId],
        staleTime: 0,
      }),
    );
  });

  it('sends onBehalfOf and waits for that organisation to be signed', async () => {
    fetchQuery.mockResolvedValueOnce(userSigned).mockResolvedValueOnce(orgSigned);

    const result = sign(orgNumber);
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchQuery).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2000);
    await result;

    expect(httpPost).toHaveBeenCalledWith(expect.stringContaining('/signing/sign?language=nb'), {
      onBehalfOf: orgNumber,
    });
    expect(fetchQuery).toHaveBeenCalledTimes(2);
  });

  it('keeps polling every two seconds until signedTime appears', async () => {
    fetchQuery.mockResolvedValueOnce(unsigned).mockResolvedValueOnce(unsigned).mockResolvedValueOnce(userSigned);

    const result = sign(null);
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchQuery).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchQuery).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchQuery).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchQuery).toHaveBeenCalledTimes(3);
    await result;
  });

  it('rejects after about a minute when the signature never becomes visible', async () => {
    fetchQuery.mockResolvedValue(unsigned);

    const result = sign(null);
    await vi.advanceTimersByTimeAsync(60_000);

    await expect(result).rejects.toThrow('not visible');
    expect(fetchQuery).toHaveBeenCalledTimes(30);
  });

  it('surfaces the sign request error without polling', async () => {
    const error = Object.assign(new Error('Request failed with status code 409'), {
      isAxiosError: true,
      response: { status: 409, data: { title: 'No signing round is open', status: 409, detail: '' } },
    });
    vi.mocked(httpPost).mockRejectedValue(error);

    await expect(sign(null)).rejects.toBe(error);
    expect(fetchQuery).not.toHaveBeenCalled();
  });

  it('invalidates the signing queries on success', () => {
    const { onSuccess } = renderMutationOptions();

    onSuccess?.(undefined, null, undefined, context);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['signing'] });
  });
});
