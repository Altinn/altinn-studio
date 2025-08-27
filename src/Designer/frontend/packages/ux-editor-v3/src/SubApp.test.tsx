import type { ReactNode } from 'react';
import React from 'react';
import { SubApp } from './SubApp';
import { render, screen, within } from '@testing-library/react';

const providerTestId = 'provider';
const appTestId = 'app';
jest.mock('./AppContext', () => ({
  AppContext: {
    Provider: ({ children }: { children: ReactNode }) => {
      return <div data-testid={providerTestId}>{children}</div>;
    },
  },
}));
jest.mock('./App', () => ({
  App: () => {
    return <div data-testid={appTestId}>App</div>;
  },
}));

describe('SubApp', () => {
  it('Renders the app within the AppContext provider', () => {
    render(<SubApp />);
    const provider = screen.getByTestId(providerTestId);
    expect(provider).toBeInTheDocument();
    expect(within(provider).getByTestId(appTestId)).toBeInTheDocument();
  });
});
