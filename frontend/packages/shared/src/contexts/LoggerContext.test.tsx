import React from 'react';
import { render } from '@testing-library/react';
import { LoggerContextProvider, type LoggerContextProviderProps } from './LoggerContext';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

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

describe('LoggerContextProvider', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('does not initialize ApplicationInsights without connectionString', () => {
    const emptyConfig = {};
    renderLoggerContext({ config: emptyConfig });

    expect(ApplicationInsights).not.toHaveBeenCalled();
  });

  test('does initialize ApplicationInsights when connectionString is provided', () => {
    renderLoggerContext({
      config: {
        connectionString: 'my-unit-test-connection-string',
      },
    });

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
