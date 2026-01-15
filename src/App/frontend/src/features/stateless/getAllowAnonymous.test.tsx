import React from 'react';

import { expect, jest } from '@jest/globals';
import { screen } from '@testing-library/react';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getLayoutSetsMock } from 'src/__mocks__/getLayoutSetsMock';
import { useAllowAnonymous } from 'src/features/stateless/getAllowAnonymous';
import { fetchApplicationMetadata } from 'src/queries/queries';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';

const TestComponent = () => {
  const allowAnonymous = useAllowAnonymous();
  return <div data-testid='allow-anonymous'>{allowAnonymous?.toString()}</div>;
};

const render = async (stateless: boolean, allowAnonymous: boolean) => {
  jest.mocked(fetchApplicationMetadata).mockImplementationOnce(async () => ({
    ...getApplicationMetadataMock(),
    ...(stateless
      ? {
          onEntry: {
            show: allowAnonymous ? 'stateless-anon' : 'stateless',
          },
        }
      : {}),
  }));

  return await renderWithoutInstanceAndLayout({
    renderer: () => <TestComponent />,
    queries: {
      fetchLayoutSets: () => Promise.resolve(getLayoutSetsMock()),
    },
  });
};

describe('getAllowAnonymous', () => {
  it('should return true if stateless && allowAnonymous is set to true on dataType', async () => {
    await render(true, true);
    expect(await screen.findByTestId('allow-anonymous')).toHaveTextContent('true');
  });

  it('should return false if stateless && allowAnonymous is set to false on dataType', async () => {
    await render(true, false);
    expect((await screen.findByTestId('allow-anonymous')).textContent).toBe('false');
  });

  it('should return false if not stateless', async () => {
    await render(false, true);
    expect((await screen.findByTestId('allow-anonymous')).textContent).toBe('false');
  });
});
