import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { LoggerContextProvider, type LoggerContextProviderProps } from './LoggerContext';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import type { AltinnStudioEnvironment } from 'app-shared/utils/altinnStudioEnv';

jest.mock('@microsoft/applicationinsights-web', () => {
  const mockTrackException = jest.fn();
  return {
    ApplicationInsights: jest.fn().mockImplementation(() => ({
      loadAppInsights: jest.fn(),
      trackException: mockTrackException,
    })),
    mockTrackException,
  };
});

jest.mock('./EnvironmentConfigContext', () => ({
  useEnvironmentConfig: jest.fn(),
}));

const { useEnvironmentConfig } = require('./EnvironmentConfigContext');

describe('LoggerContextProvider', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('does not initialize ApplicationInsights without connectionString', async () => {
    const mockEnvironment: AltinnStudioEnvironment = null;
    useEnvironmentConfig.mockReturnValue({
      environment: mockEnvironment,
      isLoading: false,
      error: null,
    });

    const emptyConfig = {};
    renderLoggerContext({ config: emptyConfig });

    await waitFor(() => {
      expect(ApplicationInsights).not.toHaveBeenCalled();
    });
  });

  test('does not initialize ApplicationInsights when environment has no aiConnectionString', async () => {
    const mockEnvironment: AltinnStudioEnvironment = {};
    useEnvironmentConfig.mockReturnValue({
      environment: mockEnvironment,
      isLoading: false,
      error: null,
    });

    const emptyConfig = {};
    renderLoggerContext({ config: emptyConfig });

    await waitFor(() => {
      expect(ApplicationInsights).not.toHaveBeenCalled();
    });
  });

  test('does initialize ApplicationInsights when connectionString is provided', async () => {
    const mockEnvironment: AltinnStudioEnvironment = {
      aiConnectionString: 'my-unit-test-connection-string',
    };
    useEnvironmentConfig.mockReturnValue({
      environment: mockEnvironment,
      isLoading: false,
      error: null,
    });

    renderLoggerContext({
      config: {
        connectionString: 'my-unit-test-connection-string',
      },
    });

    await waitFor(() => {
      expect(ApplicationInsights).toHaveBeenCalled();
    });
  });

  const renderLoggerContext = (props?: Pick<LoggerContextProviderProps, 'config'>): void => {
    render(
      <LoggerContextProvider config={{ ...props.config }}>
        <div>child</div>
      </LoggerContextProvider>,
    );
  };
});
