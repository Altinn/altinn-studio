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

  const runQueryFn = async (altinnNugetVersion: string | undefined): Promise<SigningDocument[]> => {
    mockedUseQuery.mockReturnValue({} as ReturnType<typeof useQuery>);

    renderHook(() => useDocumentList('party-id', 'instance-guid', altinnNugetVersion));

    const [queryOptions] = mockedUseQuery.mock.calls.at(-1) ?? [];

    if (!hasQueryFn(queryOptions)) {
      throw new Error('Expected useQuery to receive a queryFn');
    }

    return queryOptions.queryFn();
  };

  it('returns backend order when altinnNugetVersion is at least 8.9.0.225', async () => {
    const documents = await runQueryFn('8.9.0.225');

    expect(documents.map((doc) => doc.filename)).toEqual(['zeta.pdf', 'alpha.pdf']);
  });

  it.each<[string | undefined]>([['8.9.0.224'], [undefined]])(
    'sorts by filename when altinnNugetVersion is %s',
    async (altinnNugetVersion) => {
      const documents = await runQueryFn(altinnNugetVersion);

      expect(documents.map((doc) => doc.filename)).toEqual(['alpha.pdf', 'zeta.pdf']);
    },
  );
});
