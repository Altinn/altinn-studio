import { jest } from '@jest/globals';
import { useQuery } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';

import { type SigningDocument, useDocumentList } from 'src/layout/SigningDocumentList/api';
import { httpGet } from 'src/utils/network/sharedNetworking';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('src/utils/network/sharedNetworking', () => ({
  httpGet: jest.fn(),
}));

describe('useDocumentList', () => {
  const mockedUseQuery = jest.mocked(useQuery);
  const mockedHttpGet = jest.mocked(httpGet);

  const response = {
    dataElements: [
      {
        id: '1',
        dataType: 'attachment',
        contentType: 'application/pdf',
        filename: 'zeta.pdf',
        size: 100,
        tags: ['tag-a'],
        selfLinks: {
          apps: 'https://storage.example.com/zeta.pdf',
        },
      },
      {
        id: '2',
        dataType: 'attachment',
        contentType: 'application/pdf',
        filename: 'alpha.pdf',
        size: 200,
        tags: ['tag-b'],
        selfLinks: {
          apps: 'https://storage.example.com/alpha.pdf',
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedHttpGet.mockResolvedValue(response);
  });

  function hasQueryFn(value: unknown): value is { queryFn: () => Promise<SigningDocument[]> } {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    return 'queryFn' in value && typeof value.queryFn === 'function';
  }

  const runQueryFn = async (): Promise<SigningDocument[]> => {
    mockedUseQuery.mockReturnValue({} as ReturnType<typeof useQuery>);

    renderHook(() => useDocumentList('party-id', 'instance-guid'));

    const [queryOptions] = mockedUseQuery.mock.calls.at(-1) ?? [];

    if (!hasQueryFn(queryOptions)) {
      throw new Error('Expected useQuery to receive a queryFn');
    }

    return queryOptions.queryFn();
  };

  it('returns backend order', async () => {
    const documents = await runQueryFn();

    expect(documents.map((doc) => doc.filename)).toEqual(['zeta.pdf', 'alpha.pdf']);
  });
});
