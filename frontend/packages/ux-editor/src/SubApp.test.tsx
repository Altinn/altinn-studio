import type { ReactNode } from 'react';
import React from 'react';
import { SubApp } from './SubApp';
import { render, screen, within } from '@testing-library/react';
import { appContextMock } from './testing/appContextMock';

const providerTestId = 'provider';
const appTestId = 'app';
const formNavigationTestId = 'formNavigation';
jest.mock('./AppContext', () => ({
  AppContextProvider: ({ children }: { children: ReactNode }) => {
    return <div data-testid={providerTestId}>{children}</div>;
  },
}));
jest.mock('./hooks', () => ({
  useAppContext: () => {
    return {};
  },
}));
jest.mock('./containers/FormDesignNavigation', () => ({
  FormDesignerNavigation: () => {
    return <div data-testid={formNavigationTestId}>FormDesignerNavigation</div>;
  },
}));
jest.mock('./App', () => ({
  App: () => {
    return <div data-testid={appTestId}>App</div>;
  },
}));

describe('SubApp', () => {
  it('Renders the app within the AppContext provider', () => {
    render(<SubApp {...appContextMock} />);
    const provider = screen.getByTestId(providerTestId);
    expect(provider).toBeInTheDocument();
    expect(within(provider).getByTestId(appTestId)).toBeInTheDocument();
  });
});
