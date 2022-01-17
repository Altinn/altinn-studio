import * as React from 'react';
import {
  render as rtlRender,
  screen,
  waitForElementToBeRemoved,
} from '@testing-library/react';

import Receipt from '../../../../src/features/receipt/containers/Receipt';
import { setupServer, handlers } from '../../../../testUtils';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const render = () => {
  rtlRender(<Receipt />);
};

describe('Receipt', () => {
  it('should show "Loading..." while data is loading, and should show "Kvittering" when data is loaded', async () => {
    render();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Kvittering')).not.toBeInTheDocument();

    await waitForElementToBeRemoved(() => screen.getByText('Loading...'));

    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(screen.getByText('Kvittering')).toBeInTheDocument();
  });
});
