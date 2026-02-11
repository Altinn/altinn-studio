import React from 'react';
import { render, screen } from '@testing-library/react';
import posthog from 'posthog-js';
import { PostHogContextProvider } from './PostHogContext';
import * as EnvironmentConfigContext from '../EnvironmentConfigContext';

jest.mock('posthog-js', () => ({
  init: jest.fn(),
}));

jest.mock('@posthog/react', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../EnvironmentConfigContext', () => ({
  useEnvironmentConfig: jest.fn(),
}));

const TestChild = () => <div data-testid='child'>Child</div>;

describe('PostHogContextProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children', () => {
    (EnvironmentConfigContext.useEnvironmentConfig as jest.Mock).mockReturnValue({
      environment: null,
    });

    render(
      <PostHogContextProvider>
        <TestChild />
      </PostHogContextProvider>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should not initialize posthog when environment is null', () => {
    (EnvironmentConfigContext.useEnvironmentConfig as jest.Mock).mockReturnValue({
      environment: null,
    });

    render(
      <PostHogContextProvider>
        <TestChild />
      </PostHogContextProvider>,
    );

    expect(posthog.init).not.toHaveBeenCalled();
  });

  it('should not initialize posthog when postHogApiKey is missing', () => {
    (EnvironmentConfigContext.useEnvironmentConfig as jest.Mock).mockReturnValue({
      environment: { aiConnectionString: 'test' },
    });

    render(
      <PostHogContextProvider>
        <TestChild />
      </PostHogContextProvider>,
    );

    expect(posthog.init).not.toHaveBeenCalled();
  });

  it('should initialize posthog with correct config when postHogApiKey is present', () => {
    (EnvironmentConfigContext.useEnvironmentConfig as jest.Mock).mockReturnValue({
      environment: {
        postHogApiKey: 'test-api-key',
        postHogApiHost: 'https://posthog.example.com',
      },
    });

    render(
      <PostHogContextProvider>
        <TestChild />
      </PostHogContextProvider>,
    );

    expect(posthog.init).toHaveBeenCalledWith('test-api-key', {
      api_host: 'https://posthog.example.com',
      opt_out_capturing_by_default: true,
      persistence: 'memory',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
    });
  });

  it('should only initialize posthog once', () => {
    (EnvironmentConfigContext.useEnvironmentConfig as jest.Mock).mockReturnValue({
      environment: {
        postHogApiKey: 'test-api-key',
        postHogApiHost: 'https://posthog.example.com',
      },
    });

    const { rerender } = render(
      <PostHogContextProvider>
        <TestChild />
      </PostHogContextProvider>,
    );

    rerender(
      <PostHogContextProvider>
        <TestChild />
      </PostHogContextProvider>,
    );

    expect(posthog.init).toHaveBeenCalledTimes(1);
  });
});
