import React from 'react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { render, screen, waitFor } from '@testing-library/react';
import { VersionControlHeader } from './VersionControlHeader';
import { setWindowLocationForTests, TEST_DOMAIN } from '../../../../testing/testUtils';
import { datamodelXsdPath, repoMetaPath } from '../api-paths';

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
  rest.get(TEST_DOMAIN + datamodelXsdPath('test-org', 'test-app'), (req, res, ctx) => {
    versionControllHeaderApiCalls();
    return res(ctx.status(200), ctx.json({}));
  }),
];
const versionControlHeaderMockServer = setupServer(...handlers);

export const versionControlHeaderBeforeAll = () => {
  versionControlHeaderMockServer.listen();
};
export const versionControlHeaderafterEach = () => {
  versionControllHeaderApiCalls.mockReset();
  versionControlHeaderMockServer.resetHandlers();
};
export const versionControlHeaderafterAll = () => versionControlHeaderMockServer.resetHandlers();

beforeAll(versionControlHeaderBeforeAll);
afterEach(versionControlHeaderafterEach);
afterAll(versionControlHeaderafterAll);

describe('Shared > Version Control > VersionControlHeader', () => {
  it('should render header when type is not defined', async () => {
    render(<VersionControlHeader language={{}} hasPushRight={true} />);
    await waitFor(() => expect(versionControllHeaderApiCalls).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('version-control-header')).not.toBeNull();
    expect(await screen.queryByTestId('version-control-fetch-button')).toBeNull();
    expect(await screen.queryByTestId('version-control-share-button')).toBeNull();
  });

  it('should render header when type is header', async () => {
    const { queryByTestId } = render(
      <VersionControlHeader language={{}} type='header' hasPushRight={true} />
    );
    await waitFor(() => expect(versionControllHeaderApiCalls).toHaveBeenCalledTimes(1));
    expect(queryByTestId('version-control-header')).not.toBeNull();
    expect(queryByTestId('version-control-fetch-button')).toBeNull();
    expect(queryByTestId('version-control-share-button')).toBeNull();
  });

  it('should render fetch-button when type is fetch-button', async () => {
    const { queryByTestId } = render(
      <VersionControlHeader language={{}} hasPushRight={true} type='fetchButton' />
    );
    expect(queryByTestId('version-control-header')).toBeNull();
    expect(queryByTestId('version-control-fetch-button')).not.toBeNull();
    expect(queryByTestId('version-control-share-button')).toBeNull();
  });

  it('should render share-button when type is share-button', async () => {
    const component = render(
      <VersionControlHeader hasPushRight={true} language={{}} type='shareButton' />
    );
    expect(component.queryByTestId('version-control-header')).toBeNull();
    expect(component.queryByTestId('version-control-fetch-button')).toBeNull();
    expect(component.queryByTestId('version-control-share-button')).not.toBeNull();
  });
});
