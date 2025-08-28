import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { LoggerContextProvider, type LoggerContextProviderProps } from './LoggerContext';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import axios from 'axios';

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

jest.mock('axios');
const axiosMock = axios as jest.Mocked<typeof axios>;

describe('LoggerContextProvider', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('does not initialize ApplicationInsights without connectionString', async () => {
    jest.spyOn(console, 'warn').mockImplementation();
    axiosMock.get.mockImplementation(() => Promise.reject());
    const emptyConfig = {};
    renderLoggerContext({ config: emptyConfig });

    await waitFor(() => {
      expect(ApplicationInsights).not.toHaveBeenCalled();
    });
    jest.restoreAllMocks();
  });

  test('does initialize ApplicationInsights when connectionString is provided', async () => {
    axiosMock.get.mockImplementation(() =>
      Promise.resolve({
        data: { aiConnectionString: 'my-unit-test-connection-string' },
      }),
    );
    renderLoggerContext({
      config: {
        connectionString: 'my-unit-test-connection-string',
      },
    });

    await waitFor(() => {
      expect(ApplicationInsights).toHaveBeenCalled();
    });
  });
});

const renderLoggerContext = (props?: Pick<LoggerContextProviderProps, 'config'>): void => {
  render(
    <LoggerContextProvider config={{ ...props.config }}>
      <div>child</div>
    </LoggerContextProvider>,
  );
};
