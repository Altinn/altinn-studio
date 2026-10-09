import { afterEach, describe, expect, test, vi } from 'vitest';
import type { Mock } from 'vitest';
import { LoggerContextProvider, type LoggerContextProviderProps } from './LoggerContext';
import { render, waitFor } from '@testing-library/react';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { useEnvironmentConfig } from './EnvironmentConfigContext';

vi.mock('@microsoft/applicationinsights-web', () => ({
  ApplicationInsights: vi.fn().mockImplementation(function () {
    return {
      loadAppInsights: vi.fn(),
      trackException: vi.fn(),
    };
  }),
}));

vi.mock('./EnvironmentConfigContext', () => ({
  useEnvironmentConfig: vi.fn(),
}));

const mockConnectionString = 'my-unit-test-connection-string';

function mockEnvironmentConfig(environment: { aiConnectionString?: string } | null = {}): void {
  (useEnvironmentConfig as Mock).mockReturnValue({
    environment,
    isLoading: false,
    error: null,
  });
}

describe('LoggerContextProvider', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('does not initialize ApplicationInsights without connectionString', () => {
    mockEnvironmentConfig(null);

    renderLoggerContext();
    expect(ApplicationInsights).not.toHaveBeenCalled();
  });

  test('does not initialize ApplicationInsights when environment has no aiConnectionString', () => {
    mockEnvironmentConfig({ aiConnectionString: undefined });

    renderLoggerContext();
    expect(ApplicationInsights).not.toHaveBeenCalled();
  });

  test('does initialize ApplicationInsights when connectionString is provided', async () => {
    mockEnvironmentConfig({ aiConnectionString: mockConnectionString });

    const customConfig = { disableTelemetry: true };
    renderLoggerContext({ config: customConfig });

    await waitFor(() => {
      expect(ApplicationInsights).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            connectionString: mockConnectionString,
            disableTelemetry: true,
          }),
        }),
      );
    });
  });

  test('does not crash when ApplicationInsights constructor throws', async () => {
    await expectGracefulFailureWhenSdkThrows(function () {
      throw new Error('SDK initialization failed');
    });
  });

  test('does not crash when loadAppInsights throws', async () => {
    await expectGracefulFailureWhenSdkThrows(function () {
      return {
        loadAppInsights: () => {
          throw new Error('loadAppInsights failed');
        },
        trackException: vi.fn(),
      };
    });
  });
});

async function expectGracefulFailureWhenSdkThrows(
  mockImplementation: () => unknown,
): Promise<void> {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  mockEnvironmentConfig({ aiConnectionString: mockConnectionString });

  (ApplicationInsights as Mock).mockImplementation(mockImplementation);

  const { container } = renderLoggerContext();
  expect(container.textContent).toBe('child');

  await waitFor(() => {
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to initialize Application Insights:',
      expect.any(Error),
    );
  });

  consoleErrorSpy.mockRestore();
}

const defaultProps: LoggerContextProviderProps = {
  config: {},
  children: <div>child</div>,
};

function renderLoggerContext(props: Partial<LoggerContextProviderProps> = {}) {
  return render(<LoggerContextProvider {...defaultProps} {...props} />);
}
