import React from 'react';
import {
  render as rtlRender,
  screen,
  waitForElementToBeRemoved,
} from '@testing-library/react';

import Receipt from './Receipt';

import { setupServer, handlers, instanceHandler } from 'testConfig/testUtils';

import {
  instanceWithPdf,
  instanceWithSubstatus,
} from 'testConfig/apiResponses';

const server = setupServer(...handlers);

beforeAll(() =>
  server.listen({
    onUnhandledRequest: 'warn',
  }),
);
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

  it('should show download link to pdf when all data is loaded, and data includes pdf', async () => {
    server.use(instanceHandler(instanceWithPdf));

    render();

    await waitForElementToBeRemoved(() => screen.getByText('Loading...'));

    expect(
      screen.getByRole('link', {
        name: /ui komponents app\.pdf/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getAllByRole('link').length).toBe(1);
  });

  it('should not show download link to pdf when all data is loaded, and data does not include pdf', async () => {
    render();

    await waitForElementToBeRemoved(() => screen.getByText('Loading...'));

    expect(screen.queryAllByRole('link').length).toBe(0);
  });

  it('should show substatus when instance data contains substatus information', async () => {
    server.use(instanceHandler(instanceWithSubstatus));
    render();

    await waitForElementToBeRemoved(() => screen.getByText('Loading...'));

    expect(screen.getByTestId('receipt-substatus')).toBeInTheDocument();
  });

  it('should not show substatus when instance data does not containe substatus information', async () => {
    render();

    await waitForElementToBeRemoved(() => screen.getByText('Loading...'));

    expect(screen.queryByTestId('receipt-substatus')).not.toBeInTheDocument();
  });
});
