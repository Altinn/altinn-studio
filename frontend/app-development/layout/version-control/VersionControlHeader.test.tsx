import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { VersionControlHeader } from './VersionControlHeader';
import { setWindowLocationForTests } from '../../../testing/testUtils';
import { ServicesContextProps, ServicesContextProvider } from '../../common/ServiceContext';

setWindowLocationForTests('test-org', 'test-app');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
  useParams: () => ({
    org: 'test-org',
    app: 'test-app',
  }),
}));

/**
 * This part is probably not ideal. A more scaleable way to mock these calls should be done in a more sentral place
 * for instance the `renderWithProviders` method.
 */
export const versionControllHeaderApiCalls = jest.fn();

const queries: Partial<ServicesContextProps> = {
  getRepoMetadata: async () => {
    versionControllHeaderApiCalls();
    return {};
  },
};

describe('Shared > Version Control > VersionControlHeader', () => {
  it('should render header when type is not defined', async () => {
    render(
      <ServicesContextProvider {...queries}>
        <VersionControlHeader hasPushRight={true} />
      </ServicesContextProvider>
    );
    await waitFor(() => expect(versionControllHeaderApiCalls).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('version-control-header')).not.toBeNull();
    expect(screen.queryByTestId('version-control-fetch-button')).toBeNull();
    expect(screen.queryByTestId('version-control-share-button')).toBeNull();
  });

  it('should render header when type is header', async () => {
    render(
      <ServicesContextProvider {...queries}>
        <VersionControlHeader hasPushRight={true} />
      </ServicesContextProvider>
    );
    await waitFor(() => expect(versionControllHeaderApiCalls).toHaveBeenCalledTimes(1));
    // eslint-disable-next-line testing-library/prefer-presence-queries
    expect(screen.queryByTestId('version-control-header')).not.toBeNull();
    expect(screen.queryByTestId('version-control-fetch-button')).toBeNull();
    expect(screen.queryByTestId('version-control-share-button')).toBeNull();
  });
});
