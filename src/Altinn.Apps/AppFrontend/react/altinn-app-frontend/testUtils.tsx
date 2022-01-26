import { rest } from 'msw';
import { setupServer } from 'msw/node';

export const handlers = [
  rest.get(
    'https://api.bring.com/shippingguide/api/postalCode.json',
    (req, res, ctx) => {
      const mockApiResponse = {
        valid: true,
        result: 'OSLO',
      };
      return res(ctx.json(mockApiResponse));
    },
  ),
];

export { setupServer, rest };
