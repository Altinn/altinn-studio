import React from 'react';
import { render } from '@testing-library/react';
import { LoggerContextProvider } from './LoggerContext';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

jest.mock('@microsoft/applicationinsights-web', () => ({
  ApplicationInsights: jest.fn().mockImplementation(() => ({
    loadAppInsights: jest.fn(),
    trackException: jest.fn(),
  })),
}));

jest.mock('./EnvironmentConfigContext', () => ({
  useEnvironmentConfig: jest.fn(),
}));

const { useEnvironmentConfig } = require('./EnvironmentConfigContext');

const mockConnectionString = 'my-unit-test-connection-string';

function mockEnvironmentConfig(environment: { aiConnectionString?: string } | null = {}): void {
  useEnvironmentConfig.mockReturnValue({
    environment,
    isLoading: false,
    error: null,
  });
}

describe('LoggerContextProvider', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('does not initialize ApplicationInsights without connectionString', () => {
    mockEnvironmentConfig(null);

    renderLoggerContext();
    expect(ApplicationInsights).not.toHaveBeenCalled();
  });

  test('does not initialize ApplicationInsights when environment has no aiConnectionString', () => {
    mockEnvironmentConfig();

    renderLoggerContext();
    expect(ApplicationInsights).not.toHaveBeenCalled();
  });

  test('does initialize ApplicationInsights when connectionString is provided', () => {
    mockEnvironmentConfig({ aiConnectionString: mockConnectionString });

    renderLoggerContext();
    expect(ApplicationInsights).toHaveBeenCalled();
  });

  test('does not crash when ApplicationInsights constructor throws', () => {
    expectGracefulFailureWhenSdkThrows(() => {
      throw new Error('SDK initialization failed');
    });
  });

  test('does not crash when loadAppInsights throws', () => {
    expectGracefulFailureWhenSdkThrows(() => ({
      loadAppInsights: () => {
        throw new Error('loadAppInsights failed');
      },
      trackException: jest.fn(),
    }));
  });
});

function expectGracefulFailureWhenSdkThrows(mockImplementation: () => unknown): void {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  mockEnvironmentConfig({ aiConnectionString: mockConnectionString });

  (ApplicationInsights as jest.Mock).mockImplementation(mockImplementation);

  const { container } = renderLoggerContext();
  expect(container.textContent).toBe('child');
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    'Failed to initialize Application Insights:',
    expect.any(Error),
  );

  consoleErrorSpy.mockRestore();
}

function renderLoggerContext() {
  return render(
    <LoggerContextProvider config={{}}>
      <div>child</div>
    </LoggerContextProvider>,
  );
}
