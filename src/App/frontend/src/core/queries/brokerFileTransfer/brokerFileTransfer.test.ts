import { act, renderHook } from '@testing-library/react';

import { useBrokerFileTransferOverviewQuery } from 'src/core/queries/brokerFileTransfer';
import { createQueryTestWrapper } from 'src/test/queryTestUtils';

const BASE_URL = 'https://platform.tt02.altinn.no';

describe('useBrokerFileTransferOverviewQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks Broker once about a transfer it has not settled, unless told to poll', async () => {
    const { wrapper, queries } = createQueryTestWrapper({
      queries: {
        fetchBrokerFileTransferOverview: async () => ({ fileTransferStatus: 'UploadStarted', fileName: 'report.pdf' }),
      },
    });
    renderHook(() => useBrokerFileTransferOverviewQuery(BASE_URL, 'transfer-1'), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(queries.fetchBrokerFileTransferOverview).toHaveBeenCalledTimes(1);
  });

  it('polls until Broker settles the transfer, and readers that do not poll get the answers too', async () => {
    let status = 'UploadProcessing';
    const { wrapper, queries } = createQueryTestWrapper({
      queries: {
        fetchBrokerFileTransferOverview: async () => ({ fileTransferStatus: status, fileName: 'report.pdf' }),
      },
    });
    const { result } = renderHook(
      () => ({
        followed: useBrokerFileTransferOverviewQuery(BASE_URL, 'transfer-1', { poll: true }),
        read: useBrokerFileTransferOverviewQuery(BASE_URL, 'transfer-1'),
      }),
      { wrapper },
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.read.data?.fileTransferStatus).toBe('UploadProcessing');

    status = 'Published';
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });
    expect(result.current.read.data?.fileTransferStatus).toBe('Published');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(queries.fetchBrokerFileTransferOverview).toHaveBeenCalledTimes(2);
  });
});
