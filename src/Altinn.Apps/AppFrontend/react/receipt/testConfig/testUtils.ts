import { rest } from 'msw';
import { setupServer } from 'msw/node';

import {
  instance,
  altinnOrgs,
  currentUser,
  application,
  texts,
} from './apiResponses';

export const mockLocation = (location: object = {}) => {
  jest.spyOn(window, 'location', 'get').mockReturnValue({
    ...window.location,
    ...location,
  });
};

export const instanceHandler = (response: any) => {
  return rest.get(
    'https://platform.at21.altinn.cloud/receipt/api/v1/instances/mockInstanceOwnerId/6697de17-18c7-4fb9-a428-d6a414a797ae',
    (req, res, ctx) => {
      return res(ctx.json(response));
    },
  );
};

export const textsHandler = (response: any) => {
  return rest.get(
    'https://localhost/storage/api/v1/applications/ttd/frontend-test/texts/nb',
    (req, res, ctx) => {
      return res(ctx.json(response));
    },
  );
};

export const handlers: any = [
  instanceHandler(instance),
  textsHandler(texts),

  rest.get('https://altinncdn.no/orgs/altinn-orgs.json', (req, res, ctx) => {
    return res(ctx.json(altinnOrgs));
  }),

  rest.get(
    'https://localhost/receipt/api/v1/users/current',
    (req, res, ctx) => {
      return res(ctx.json(currentUser));
    },
  ),

  rest.get(
    'https://platform.at21.altinn.cloud/storage/api/v1/applications/ttd/frontend-test',
    (req, res, ctx) => {
      return res(ctx.json(application));
    },
  ),
];

export { setupServer, rest };
