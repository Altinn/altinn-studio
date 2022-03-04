import React from 'react';
import {
  render as rtlRender,
  screen,
  waitForElementToBeRemoved,
} from '@testing-library/react';

import Receipt from './Receipt';

import {
  setupServer,
  handlers,
  instanceHandler,
  textsHandler,
} from 'testConfig/testUtils';

import {
  instanceWithPdf,
  instanceWithSubstatus,
  texts,
} from 'testConfig/apiResponses';

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

  it('should show customised text when textResources contains overrides', async () => {
    const textsWithOverrides = {
      ...texts,
      resources: [
        ...texts.resources,
        {
          id: 'receipt_platform.helper_text',
          value: 'Help text override',
        },
      ],
    };
    server.use(textsHandler(textsWithOverrides));

    render();

    await waitForElementToBeRemoved(() => screen.getByText('Loading...'));

    expect(screen.getByText('Help text override')).toBeInTheDocument();
  });

  it('should show customised text with variables when textResources contains overrides', async () => {
    const textsWithOverrides = {
      ...texts,
      resources: [
        ...texts.resources,
        {
          id: 'receipt_platform.helper_text',
          value: 'Help text override with instanceOwnerPartyId variable: {0}',
          variables: [
            {
              key: 'instanceOwnerPartyId',
              dataSource: 'instanceContext',
            },
          ],
        },
      ],
    };
    server.use(textsHandler(textsWithOverrides));

    render();

    await waitForElementToBeRemoved(() => screen.getByText('Loading...'));

    expect(
      screen.getByText(
        'Help text override with instanceOwnerPartyId variable: 512345',
      ),
    ).toBeInTheDocument();
  });

  it('should parse customised text with markdown when textResources contains overrides', async () => {
    const textsWithOverrides = {
      ...texts,
      resources: [
        ...texts.resources,
        {
          id: 'receipt_platform.helper_text',
          value: `Help text with [a link to altinn](https://altinn.no)`,
        },
      ],
    };
    server.use(textsHandler(textsWithOverrides));

    render();

    await waitForElementToBeRemoved(() => screen.getByText('Loading...'));

    expect(
      screen.getByRole('link', {
        name: /a link to altinn/i,
      }),
    ).toBeInTheDocument();
  });
});
