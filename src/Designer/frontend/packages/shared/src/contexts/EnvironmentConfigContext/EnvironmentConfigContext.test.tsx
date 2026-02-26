import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { EnvironmentConfigProvider, useEnvironmentConfig } from './EnvironmentConfigContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import axios from 'axios';
import type { AltinnStudioEnvironment } from 'app-shared/utils/altinnStudioEnv';

jest.mock('axios');
const axiosMock = axios as jest.Mocked<typeof axios>;

jest.mock('app-shared/api/paths', () => ({
  envFilePath: jest.fn(() => '/designer/api/v1/environment'),
}));

const TestComponent = () => {
  const { environment, isLoading, error } = useEnvironmentConfig();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!environment) return <div>No environment</div>;

  return (
    <div>
      <div data-testid='ai-connection-string'>{environment.aiConnectionString}</div>
    </div>
  );
};

const renderWithProvider = () => {
  return render(
    <QueryClientProvider client={createQueryClientMock()}>
      <EnvironmentConfigProvider>
        <TestComponent />
      </EnvironmentConfigProvider>
    </QueryClientProvider>,
  );
};

describe('EnvironmentConfigContext', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and provide environment config successfully', async () => {
    const mockEnvironment: AltinnStudioEnvironment = {
      aiConnectionString: 'test-ai-connection-string',
    };

    axiosMock.get.mockResolvedValueOnce({ data: mockEnvironment });

    renderWithProvider();

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('ai-connection-string')).toHaveTextContent(
        'test-ai-connection-string',
      );
    });
  });

  it('should handle fetch errors gracefully', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    axiosMock.get.mockRejectedValueOnce(new Error('Network error'));

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText('No environment')).toBeInTheDocument();
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Could not load environment file. This is expected for local dev environments.',
      expect.any(Error),
    );

    consoleWarnSpy.mockRestore();
  });

  it('should handle null response data', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    axiosMock.get.mockResolvedValueOnce({ data: null });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText('No environment')).toBeInTheDocument();
    });

    consoleWarnSpy.mockRestore();
  });

  it('should throw error when useEnvironmentConfig is used outside provider', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useEnvironmentConfig must be used within an EnvironmentConfigProvider');

    consoleErrorSpy.mockRestore();
  });

  it('should cache the environment config', async () => {
    const mockEnvironment: AltinnStudioEnvironment = {
      aiConnectionString: 'test-ai-connection-string',
    };

    const queryClient = createQueryClientMock();
    axiosMock.get.mockResolvedValueOnce({ data: mockEnvironment });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <EnvironmentConfigProvider>
          <TestComponent />
        </EnvironmentConfigProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('ai-connection-string')).toHaveTextContent(
        'test-ai-connection-string',
      );
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <EnvironmentConfigProvider>
          <TestComponent />
        </EnvironmentConfigProvider>
      </QueryClientProvider>,
    );

    expect(axiosMock.get).toHaveBeenCalledTimes(1);
  });
});
