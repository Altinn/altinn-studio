const randomUUID = () => '00000000-0000-4000-8000-000000000000';
import { ZodError } from 'zod';

import { fetchSigneeList, NotificationStatus, SigneeState } from 'src/layout/SigneeList/api';
import { httpGet } from 'src/utils/network/sharedNetworking';

vi.mock('src/utils/network/sharedNetworking');

const mockedGet = vi.mocked(httpGet);

describe('fetchSigneeList', () => {
  const partyId = '40003';
  const instanceGuid = randomUUID();

  it('should successfully fetch signee list', async () => {
    const signedTime = new Date().toISOString();
    mockedGet.mockResolvedValue({
      signeeStates: [
        {
          name: '',
          organization: 'ACME',
          signedTime,
          hasSigned: true,
          delegationSuccessful: true,
          delegationFailure: undefined,
          notificationStatus: NotificationStatus.Failed,
          notificationFailure: undefined,
          partyId: 123,
        },
        {
          name: 'Jane Doe',
          organization: 'ACME',
          signedTime: null,
          hasSigned: false,
          delegationSuccessful: false,
          delegationFailure: undefined,
          notificationStatus: NotificationStatus.Failed,
          notificationFailure: undefined,
          partyId: 123,
        },
      ] satisfies SigneeState[],
    });

    const result = await fetchSigneeList(partyId, instanceGuid);

    expect(result).toEqual([
      {
        name: null,
        organization: 'Acme',
        signedTime,
        hasSigned: true,
        delegationSuccessful: true,
        delegationFailure: undefined,
        notificationStatus: NotificationStatus.Failed,
        notificationFailure: undefined,
        partyId: 123,
      },
      {
        name: 'Jane Doe',
        organization: 'Acme',
        signedTime: null,
        hasSigned: false,
        delegationSuccessful: false,
        delegationFailure: undefined,
        notificationStatus: NotificationStatus.Failed,
        notificationFailure: undefined,
        partyId: 123,
      },
    ] satisfies SigneeState[]);
  });

  it('should throw error if response is invalid', async () => {
    mockedGet.mockResolvedValue({
      signeeStates: [
        {
          name: '',
          organization: 'Acme',
        },
      ],
    });

    expect.assertions(1);
    return fetchSigneeList(partyId, instanceGuid).catch((error) => expect(error).toBeInstanceOf(ZodError));
  });

  it('should throw error if name and organization is missing/empty', async () => {
    mockedGet.mockResolvedValue({
      signeeStates: [
        {
          name: '',
          organization: '',
          hasSigned: true,
          delegationSuccessful: true,
          delegationFailure: undefined,
          notificationStatus: NotificationStatus.Failed,
          notificationFailure: undefined,
          partyId: 123,
          signedTime: new Date().toISOString(),
        },
      ] satisfies SigneeState[],
    });

    expect.assertions(1);
    return fetchSigneeList(partyId, instanceGuid).catch((error) => expect(error).toBeInstanceOf(ZodError));
  });

  it('should throw if httpGet fails', async () => {
    mockedGet.mockRejectedValue(new Error('Network error'));

    expect.assertions(1);
    return fetchSigneeList(partyId, instanceGuid).catch((error) => expect(error).toBeInstanceOf(Error));
  });

  it('should sort signee list by name', async () => {
    const signedTime = new Date().toISOString();

    mockedGet.mockResolvedValue({
      signeeStates: [
        {
          name: 'Sylvester Stallone',
          organization: 'ACME',
          signedTime,
          hasSigned: true,
          delegationSuccessful: true,
          delegationFailure: undefined,
          notificationStatus: NotificationStatus.Sent,
          notificationFailure: undefined,
          partyId: 123,
        },
        {
          name: 'Mary Jane',
          organization: 'ACME',
          signedTime: null,
          hasSigned: false,
          delegationSuccessful: false,
          delegationFailure: undefined,
          notificationStatus: NotificationStatus.NotSent,
          notificationFailure: undefined,
          partyId: 123,
        },
      ] satisfies SigneeState[],
    });

    const result = await fetchSigneeList(partyId, instanceGuid);
    expect(result).toEqual([
      {
        name: 'Mary Jane',
        organization: 'Acme',
        signedTime: null,
        hasSigned: false,
        delegationSuccessful: false,
        delegationFailure: undefined,
        notificationStatus: NotificationStatus.NotSent,
        notificationFailure: undefined,
        partyId: 123,
      },
      {
        name: 'Sylvester Stallone',
        organization: 'Acme',
        signedTime,
        hasSigned: true,
        delegationSuccessful: true,
        delegationFailure: undefined,
        notificationStatus: NotificationStatus.Sent,
        notificationFailure: undefined,
        partyId: 123,
      },
    ] satisfies SigneeState[]);
  });

  it('should append taskId as query parameter when provided', async () => {
    const taskId = 'MyTask';
    mockedGet.mockResolvedValue({ signeeStates: [] });

    await fetchSigneeList(partyId, instanceGuid, taskId);

    expect(mockedGet).toHaveBeenCalledWith(expect.stringContaining(`?taskId=${taskId}`));
  });

  it('should not append taskId query parameter when undefined', async () => {
    mockedGet.mockResolvedValue({ signeeStates: [] });

    await fetchSigneeList(partyId, instanceGuid, undefined);

    expect(mockedGet).toHaveBeenCalledWith(expect.not.stringContaining('?taskId'));
  });

  describe('delegationFailure and notificationFailure', () => {
    const baseSignee = {
      name: 'Jane Doe',
      organization: 'ACME',
      signedTime: null,
      delegationSuccessful: false,
      notificationStatus: NotificationStatus.Failed,
      partyId: 123,
    };

    it('should parse delegationFailure as undefined when the field is absent', async () => {
      mockedGet.mockResolvedValue({ signeeStates: [{ ...baseSignee }] });

      const [result] = await fetchSigneeList(partyId, instanceGuid);

      expect(result.delegationFailure).toBeUndefined();
    });

    it('should parse delegationFailure as undefined when the field is null', async () => {
      mockedGet.mockResolvedValue({ signeeStates: [{ ...baseSignee, delegationFailure: null }] });

      const [result] = await fetchSigneeList(partyId, instanceGuid);

      expect(result.delegationFailure).toBeUndefined();
    });

    it.each(['InvalidParty', 'Rejected', 'Unknown'] as const)(
      'should parse delegationFailure as %s when the backend sends that value',
      async (delegationFailure) => {
        mockedGet.mockResolvedValue({ signeeStates: [{ ...baseSignee, delegationFailure }] });

        const [result] = await fetchSigneeList(partyId, instanceGuid);

        expect(result.delegationFailure).toEqual(delegationFailure);
      },
    );

    it('should parse delegationFailure as undefined when the backend sends an unrecognised value', async () => {
      mockedGet.mockResolvedValue({ signeeStates: [{ ...baseSignee, delegationFailure: 'SomeFutureCode' }] });

      const [result] = await fetchSigneeList(partyId, instanceGuid);

      expect(result.delegationFailure).toBeUndefined();
    });

    it('should parse notificationFailure as undefined when the field is absent', async () => {
      mockedGet.mockResolvedValue({ signeeStates: [{ ...baseSignee }] });

      const [result] = await fetchSigneeList(partyId, instanceGuid);

      expect(result.notificationFailure).toBeUndefined();
    });

    it('should parse notificationFailure as undefined when the field is null', async () => {
      mockedGet.mockResolvedValue({ signeeStates: [{ ...baseSignee, notificationFailure: null }] });

      const [result] = await fetchSigneeList(partyId, instanceGuid);

      expect(result.notificationFailure).toBeUndefined();
    });

    it.each(['Configuration', 'ServiceOwnerUnavailable', 'Rejected', 'Unknown'] as const)(
      'should parse notificationFailure as %s when the backend sends that value',
      async (notificationFailure) => {
        mockedGet.mockResolvedValue({ signeeStates: [{ ...baseSignee, notificationFailure }] });

        const [result] = await fetchSigneeList(partyId, instanceGuid);

        expect(result.notificationFailure).toEqual(notificationFailure);
      },
    );

    it('should parse notificationFailure as undefined when the backend sends an unrecognised value', async () => {
      mockedGet.mockResolvedValue({ signeeStates: [{ ...baseSignee, notificationFailure: 'SomeFutureCode' }] });

      const [result] = await fetchSigneeList(partyId, instanceGuid);

      expect(result.notificationFailure).toBeUndefined();
    });
  });
});
