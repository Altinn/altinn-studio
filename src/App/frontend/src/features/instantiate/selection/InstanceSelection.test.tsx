import React from 'react';

import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { InstanceSelectionWrapper } from 'src/features/instantiate/selection/InstanceSelection';
import { mockMediaQuery } from 'src/test/mockMediaQuery';
import { renderWithInstanceAndLayout, renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import type { ISimpleInstance } from 'src/types';

const mockActiveInstances: ISimpleInstance[] = [
  {
    id: '512345/some-guid',
    lastChanged: '2021-10-05T07:51:57.8795258Z',
    lastChangedBy: 'Navn Navnesen',
  },
  {
    id: '512345/some-other-guid',
    lastChanged: '2021-05-13T07:51:57.8795258Z',
    lastChangedBy: 'Kåre Nordmannsen',
  },
];

const render = async (instances = mockActiveInstances) => {
  const instanceCreateMock = vi.fn(async () => ({
    ...getInstanceDataMock(),
    id: '512345/new-instance-guid',
    process: getProcessDataMock(),
  }));
  const renderResult = await renderWithInstanceAndLayout({
    renderer: () => <InstanceSelectionWrapper />,
    apis: {
      instanceApi: {
        getActiveInstances: async () => instances || [],
        create: instanceCreateMock,
      },
    },
  });
  return {
    ...renderResult,
    instanceCreateMock,
  };
};

const { setScreenWidth } = mockMediaQuery(992);

describe('InstanceSelection', () => {
  beforeEach(() => {
    // Set screen size to desktop
    setScreenWidth(1200);
  });

  it('should show full size table for larger devices', async () => {
    const { container } = await render();

    const altinnTable = container.querySelector('#instance-selection-table');
    expect(altinnTable).not.toBeNull();
  });

  it('should display mobile table for smaller devices', async () => {
    // Set screen size to mobile
    setScreenWidth(600);
    const { container } = await render();

    const altinnMobileTable = container.querySelector('#instance-selection-mobile-table');
    expect(altinnMobileTable).not.toBeNull();
  });

  it('should display active instances', async () => {
    await render();

    const firstInstanceChangedBy = await screen.findByText(mockActiveInstances[0].lastChangedBy);
    const secondInstanceChangedBy = await screen.findByText(mockActiveInstances[1].lastChangedBy);

    const firstInstanceLastChanged = await screen.findByText('10/05/2021');
    const secondInstanceLastChanged = await screen.findByText('05/13/2021');

    expect(firstInstanceChangedBy).not.toBeNull();
    expect(secondInstanceChangedBy).not.toBeNull();

    expect(firstInstanceLastChanged).not.toBeNull();
    expect(secondInstanceLastChanged).not.toBeNull();
  });

  it('pressing "Start på nytt" should trigger callback', async () => {
    const { instanceCreateMock } = await render();
    await userEvent.click(screen.getByText(/start på nytt/i));
    expect(instanceCreateMock).toHaveBeenCalledTimes(1);
  });

  it('should explain that new instances cannot be started when instantiation responds with 410', async () => {
    vi.spyOn(window, 'logError').mockImplementation(() => {});
    await renderWithoutInstanceAndLayout({
      renderer: () => <InstanceSelectionWrapper />,
      apis: {
        instanceApi: {
          getActiveInstances: async () => mockActiveInstances,
          create: async () => {
            throw Object.assign(new Error('Gone'), { isAxiosError: true, response: { status: 410 } });
          },
        },
      },
    });
    await userEvent.click(screen.getByText(/start på nytt/i));

    await waitFor(() =>
      expect(screen.getByText(/det er ikke mulig å starte nye skjema i denne tjenesten/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/ikke har rettigheter til å starte denne tjenesten/i)).not.toBeInTheDocument();
  });

  it('should list active instances but not offer to start a new one when validTo has passed', async () => {
    window.altinnAppGlobalData.applicationMetadata = getApplicationMetadataMock({ validTo: '2020-01-01T00:00:00Z' });
    const { instanceCreateMock } = await render();

    expect(await screen.findByText(mockActiveInstances[0].lastChangedBy)).toBeInTheDocument();
    expect(screen.getByText(/det er ikke mulig å starte nye skjema i denne tjenesten/i)).toBeInTheDocument();
    expect(screen.queryByText(/start på nytt/i)).not.toBeInTheDocument();
    expect(instanceCreateMock).not.toHaveBeenCalled();
  });

  it('should list active instances but not offer to start a new one before validFrom', async () => {
    window.altinnAppGlobalData.applicationMetadata = getApplicationMetadataMock({ validFrom: '2099-01-01T10:00:00Z' });
    const { instanceCreateMock } = await render();

    expect(await screen.findByText(mockActiveInstances[0].lastChangedBy)).toBeInTheDocument();
    expect(screen.getByText(/Tjenesten åpner 01\.01\.2099/)).toBeInTheDocument();
    expect(screen.queryByText(/start på nytt/i)).not.toBeInTheDocument();
    expect(instanceCreateMock).not.toHaveBeenCalled();
  });

  it('should trigger openInstance on editButton click', async () => {
    const { instanceCreateMock, routerRef } = await render();
    const row = screen.getByRole('row', {
      name: /10\/05\/2021 navn navnesen fortsett her/i,
    });

    const button = within(row).getByRole('button', {
      name: /fortsett her/i,
    });

    await userEvent.click(button);
    expect(routerRef.current!.state.location.pathname).toBe('/ttd/test/instance/512345/some-guid');
    expect(instanceCreateMock).toHaveBeenCalledTimes(0);
  });

  it('should trigger openInstance on editButton click during mobile view', async () => {
    // Set screen size to mobile
    setScreenWidth(600);
    const { instanceCreateMock, routerRef } = await render();

    const row = screen.getByRole('row', {
      name: /Sist endret: 05\/13\/2021 Endret av: Kåre Nordmannsen/i,
    });

    const button = within(row).getByRole('button', {
      name: /fortsett her/i,
    });

    await userEvent.click(button);
    expect(routerRef.current!.state.location.pathname).toBe('/ttd/test/instance/512345/some-other-guid');
    expect(instanceCreateMock).toHaveBeenCalledTimes(0);
  });
});
