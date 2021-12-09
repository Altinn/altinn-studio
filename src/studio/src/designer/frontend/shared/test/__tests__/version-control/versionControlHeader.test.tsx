import 'jest';
import * as React from 'react';
import { mount } from 'enzyme';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

import { IAltinnWindow } from '../../../types';
import { VersionControlContainer } from '../../../version-control/versionControlHeader';

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
  rest.get(
    'http://localhost/designer/api/v1/repos/test-org/test-app/status',
    (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          behindBy: 0,
          repositoryStatus: 'ok',
          contentStatus: [],
        }),
      );
    },
  ),
  rest.get(
    'http://localhost/designer/api/v1/repos/test-org/test-app/latestcommit',
    (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          comitter: {
            when: '',
          },
        }),
      );
    },
  ),
  rest.get(
    'http://localhost/designer/undefined//Model/GetXsd',
    (req, res, ctx) => {
      return res(ctx.status(200), ctx.json({}));
    },
  ),
];
const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Shared > Version Control > VersionControlHeader', () => {
  it('should render header when type is not defined', () => {
    (window as Window as IAltinnWindow).org = 'test-org';
    (window as Window as IAltinnWindow).app = 'test-app';

    const component = mount(<VersionControlContainer language={{}} />);
    expect(component.isEmptyRender()).toBe(false);
    expect(
      component.find('[data-testid="version-control-header"]').exists(),
    ).toBe(true);
    expect(
      component.find('[data-testid="version-control-fetch-button"]').exists(),
    ).toBe(false);
    expect(
      component.find('[data-testid="version-control-share-button"]').exists(),
    ).toBe(false);
  });

  it('should render header when type is header', () => {
    (window as Window as IAltinnWindow).org = 'test-org';
    (window as Window as IAltinnWindow).app = 'test-app';

    const component = mount(
      <VersionControlContainer language={{}} type='header' />,
    );
    expect(component.isEmptyRender()).toBe(false);
    expect(
      component.find('[data-testid="version-control-header"]').exists(),
    ).toBe(true);
    expect(
      component.find('[data-testid="version-control-fetch-button"]').exists(),
    ).toBe(false);
    expect(
      component.find('[data-testid="version-control-share-button"]').exists(),
    ).toBe(false);
  });

  it('should render fetch-button when type is fetch-button', () => {
    (window as Window as IAltinnWindow).org = 'test-org';
    (window as Window as IAltinnWindow).app = 'test-app';

    const component = mount(
      <VersionControlContainer language={{}} type='fetchButton' />,
    );
    expect(component.isEmptyRender()).toBe(false);
    expect(
      component.find('[data-testid="version-control-header"]').exists(),
    ).toBe(false);
    expect(
      component.find('[data-testid="version-control-fetch-button"]').exists(),
    ).toBe(true);
    expect(
      component.find('[data-testid="version-control-share-button"]').exists(),
    ).toBe(false);
  });

  it('should render share-button when type is share-button', () => {
    (window as Window as IAltinnWindow).org = 'test-org';
    (window as Window as IAltinnWindow).app = 'test-app';

    const component = mount(
      <VersionControlContainer language={{}} type='shareButton' />,
    );
    expect(component.isEmptyRender()).toBe(false);
    expect(
      component.find('[data-testid="version-control-header"]').exists(),
    ).toBe(false);
    expect(
      component.find('[data-testid="version-control-fetch-button"]').exists(),
    ).toBe(false);
    expect(
      component.find('[data-testid="version-control-share-button"]').exists(),
    ).toBe(true);
  });
});
