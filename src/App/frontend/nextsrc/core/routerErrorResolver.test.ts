import { isRouteErrorResponse } from 'react-router-dom';

import { RouterErrorResolver } from 'nextsrc/core/routerErrorResolver';

jest.mock('react-router-dom', () => ({
  isRouteErrorResponse: jest.fn(),
}));

describe('RouterErrorResolver', () => {
  it('should return data from route error response', () => {
    (isRouteErrorResponse as unknown as jest.Mock).mockReturnValue(true);

    const error = { data: 'Not found', status: 404, statusText: 'Not Found' };
    expect(RouterErrorResolver.resolveMessage(error)).toBe('Not found');
  });

  it('should return statusText when data is empty', () => {
    (isRouteErrorResponse as unknown as jest.Mock).mockReturnValue(true);

    const error = { data: '', status: 401, statusText: 'Unauthorized' };
    expect(RouterErrorResolver.resolveMessage(error)).toBe('Unauthorized');
  });

  it('should return message from Error instance', () => {
    (isRouteErrorResponse as unknown as jest.Mock).mockReturnValue(false);

    expect(RouterErrorResolver.resolveMessage(new Error('Something broke'))).toBe('Something broke');
  });

  it('should return fallback message for unknown errors', () => {
    (isRouteErrorResponse as unknown as jest.Mock).mockReturnValue(false);

    expect(RouterErrorResolver.resolveMessage('unexpected')).toBe('An unexpected error occurred');
  });
});
