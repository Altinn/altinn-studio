import React from 'react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { render } from '@testing-library/react';
import type { IAltinnWindow } from '../types/global';
import { VersionControlContainer } from './versionControlHeader';
import { sharedUrls } from 'app-shared/utils/urlHelper';

const handlers = [
  rest.get(
    'http://localhost/designer/api/v1/repos/test-org/test-app',
    (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          permissions: {
            push: false,
          },
        }),
      );
    },
  ),
  rest.get(sharedUrls().dataModelXsdUrl, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({}));
  }),
];
const versionControlHeaderMockServer = setupServer(...handlers);

export const versionControlHeaderBeforeAll = () => {
  (window as Window as IAltinnWindow).org = 'test-org';
  (window as Window as IAltinnWindow).app = 'test-app';
  versionControlHeaderMockServer.listen();
};
export const versionControlHeaderafterEach = () =>
  versionControlHeaderMockServer.resetHandlers();
export const versionControlHeaderafterAll = () =>
  versionControlHeaderMockServer.resetHandlers();
beforeAll(versionControlHeaderBeforeAll);
afterEach(versionControlHeaderafterEach);
afterAll(versionControlHeaderafterAll);

describe('Shared > Version Control > VersionControlHeader', () => {
  it('should render header when type is not defined', async () => {
    const component = render(<VersionControlContainer language={{}} />);
    expect(component.queryByTestId('version-control-header')).not.toBeNull();
    expect(component.queryByTestId('version-control-fetch-button')).toBeNull();
    expect(component.queryByTestId('version-control-share-button')).toBeNull();
  });

  it('should render header when type is header', async () => {
    const { queryByTestId } = render(
      <VersionControlContainer language={{}} type='header' />,
    );
    expect(queryByTestId('version-control-header')).not.toBeNull();
    expect(queryByTestId('version-control-fetch-button')).toBeNull();
    expect(queryByTestId('version-control-share-button')).toBeNull();
  });

  it('should render fetch-button when type is fetch-button', async () => {
    const { queryByTestId } = render(
      <VersionControlContainer language={{}} type='fetchButton' />,
    );
    expect(queryByTestId('version-control-header')).toBeNull();
    expect(queryByTestId('version-control-fetch-button')).not.toBeNull();
    expect(queryByTestId('version-control-share-button')).toBeNull();
  });

  it('should render share-button when type is share-button', async () => {
    const component = render(
      <VersionControlContainer language={{}} type='shareButton' />,
    );
    expect(component.queryByTestId('version-control-header')).toBeNull();
    expect(component.queryByTestId('version-control-fetch-button')).toBeNull();
    expect(
      component.queryByTestId('version-control-share-button'),
    ).not.toBeNull();
  });
});
