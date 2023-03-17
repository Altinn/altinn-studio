import React from 'react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { render, screen, waitFor } from '@testing-library/react';
import { VersionControlHeader } from './VersionControlHeader';
import { setWindowLocationForTests, TEST_DOMAIN } from '../../../testing/testUtils';
import { datamodelsXsdPath, repoMetaPath } from 'app-shared/api-paths';

setWindowLocationForTests('test-org', 'test-app');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
  useParams: () => ({
    org: 'test-org',
    app: 'test-app',
  }),
}));

export const versionControllHeaderApiCalls = jest.fn();

const handlers = [
  rest.get(TEST_DOMAIN + repoMetaPath('test-org', 'test-app'), (req, res, ctx) => {
    versionControllHeaderApiCalls();
    return res(
      ctx.status(200),
      ctx.json({
        permissions: {
          push: false,
        },
      })
    );
  }),
  rest.get(TEST_DOMAIN + datamodelsXsdPath('test-org', 'test-app'), (req, res, ctx) => {
    versionControllHeaderApiCalls();
    return res(ctx.status(200), ctx.json({}));
  }),
];
const versionControlHeaderMockServer = setupServer(...handlers);

export const versionControlHeaderBeforeAll = () => versionControlHeaderMockServer.listen();

export const versionControlHeaderAfterEach = () => {
  versionControllHeaderApiCalls.mockReset();
  versionControlHeaderMockServer.resetHandlers();
};
export const versionControlHeaderAfterAll = () => versionControlHeaderMockServer.resetHandlers();

beforeAll(versionControlHeaderBeforeAll);
afterEach(versionControlHeaderAfterEach);
afterAll(versionControlHeaderAfterAll);

describe('Shared > Version Control > VersionControlHeader', () => {
  it('should render header when type is not defined', async () => {
    render(<VersionControlHeader hasPushRight={true} />);
    await waitFor(() => expect(versionControllHeaderApiCalls).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('version-control-header')).not.toBeNull();
    expect(screen.queryByTestId('version-control-fetch-button')).toBeNull();
    expect(screen.queryByTestId('version-control-share-button')).toBeNull();
  });

  it('should render header when type is header', async () => {
    render(<VersionControlHeader hasPushRight={true} />);
    await waitFor(() => expect(versionControllHeaderApiCalls).toHaveBeenCalledTimes(1));
    // eslint-disable-next-line testing-library/prefer-presence-queries
    expect(screen.queryByTestId('version-control-header')).not.toBeNull();
    expect(screen.queryByTestId('version-control-fetch-button')).toBeNull();
    expect(screen.queryByTestId('version-control-share-button')).toBeNull();
  });
});
