import React from 'react';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosError, AxiosResponse } from 'axios';

import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { renderWithMinimalProviders } from 'src/test/renderWithProviders';

// Need to unmock axios to get actual implementation of isAxiosError
vi.unmock('axios');

const failedInstantiationBody = {
  title: 'Instance initialization failed.',
  status: 500,
};

function makeInstantiationError(): AxiosError {
  const error = new Error('Request failed with status code 500') as AxiosError;
  error.name = 'AxiosError';
  error.isAxiosError = true;
  error.config = {
    method: 'post',
    baseURL: '/ttd/component-library',
    url: '/instances?instanceOwnerPartyId=501337&language=nb',
  } as AxiosError['config'];
  error.response = { status: 500, data: failedInstantiationBody } as AxiosResponse;
  return error;
}

describe('Unknown error', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should be able to render with minimal providers', async () => {
    const user = userEvent.setup({ delay: null });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await renderWithMinimalProviders({
      renderer: () => <UnknownError error={new Error('Error test message')} />,
    });

    expect(screen.getByTestId('StatusCode')).toBeInTheDocument();
    expect(screen.getByTestId('StatusCode')).toHaveTextContent('Ukjent feil');
    expect(screen.getByTestId('AltinnError')).toHaveTextContent(
      'Det har skjedd en ukjent feil, vennligst prøv igjen senere.',
    );

    expect(console.error).not.toHaveBeenCalled();

    const showDetailsSummary = screen.getByText('Vis detaljer om feilen').closest('summary')!;
    await user.click(showDetailsSummary);
    expect(screen.getByText('Error test message')).toBeInTheDocument();

    const writeTextMock = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

    const copyButton = screen.getByRole('button', { name: 'Kopier' });
    await user.click(copyButton);
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('Error test message'));
    expect(copyButton).toHaveAccessibleName('Kopiert');
  });

  it('should show the failing request and the response body for an axios error', async () => {
    const user = userEvent.setup({ delay: null });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await renderWithMinimalProviders({
      renderer: () => <UnknownError error={makeInstantiationError()} />,
    });

    await user.click(screen.getByText('Vis detaljer om feilen').closest('summary')!);

    expect(screen.getByText('POST')).toBeInTheDocument();
    expect(screen.getByText('/instances?instanceOwnerPartyId=501337&language=nb')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText(/"title": "Instance initialization failed\."/)).toBeInTheDocument();

    const writeTextMock = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    await user.click(screen.getByRole('button', { name: 'Kopier' }));

    const copiedJson = JSON.parse(writeTextMock.mock.calls[0][0]);
    expect(copiedJson).toMatchObject({
      method: 'POST',
      url: '/instances?instanceOwnerPartyId=501337&language=nb',
      responseStatus: 500,
      responseData: failedInstantiationBody,
    });
  });
});
