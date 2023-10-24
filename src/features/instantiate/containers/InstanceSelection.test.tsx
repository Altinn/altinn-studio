import React from 'react';

import { act, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import configureStore from 'redux-mock-store';
import type { Store } from 'redux';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { InstanceSelection } from 'src/features/instantiate/containers/InstanceSelection';
import { mockMediaQuery } from 'src/test/mockMediaQuery';
import { renderWithProviders } from 'src/test/renderWithProviders';
import type { IInstanceSelectionProps } from 'src/features/instantiate/containers/InstanceSelection';
import type { IRuntimeState, ISimpleInstance } from 'src/types';

const renderInstanceSelection = (store: Store, props: IInstanceSelectionProps) =>
  renderWithProviders(<InstanceSelection {...props} />, { store });

const { setScreenWidth } = mockMediaQuery(992);
const user = userEvent.setup();

describe('InstanceSelection', () => {
  let mockInitialState: IRuntimeState;
  let mockStore: any;
  let mockStartNewInstance: () => void;
  let mockActiveInstances: ISimpleInstance[];

  beforeEach(() => {
    // Set screen size to desktop
    setScreenWidth(1200);
    const createStore = configureStore();
    mockInitialState = getInitialStateMock({});
    mockStore = createStore(mockInitialState);
    mockStartNewInstance = jest.fn();
    mockActiveInstances = [
      {
        id: 'some-id',
        lastChanged: '2021-10-05T07:51:57.8795258Z',
        lastChangedBy: 'Navn Navnesen',
      },
      {
        id: 'some-other-id',
        lastChanged: '2021-05-13T07:51:57.8795258Z',
        lastChangedBy: 'Kåre Nordmannsen',
      },
    ];
  });

  it('should show full size table for larger devices', () => {
    // eslint-disable-next-line testing-library/render-result-naming-convention
    const rendered = renderInstanceSelection(mockStore, {
      instances: mockActiveInstances,
      onNewInstance: mockStartNewInstance,
    });
    // eslint-disable-next-line
    const altinnTable = rendered.container.querySelector('#instance-selection-table');
    expect(altinnTable).not.toBeNull();
  });

  it('should display mobile table for smaller devices', () => {
    // Set screen size to mobile
    setScreenWidth(600);
    // eslint-disable-next-line testing-library/render-result-naming-convention
    const rendered = renderInstanceSelection(mockStore, {
      instances: mockActiveInstances,
      onNewInstance: mockStartNewInstance,
    });
    // eslint-disable-next-line
    const altinnMobileTable = rendered.container.querySelector('#instance-selection-mobile-table');
    expect(altinnMobileTable).not.toBeNull();
  });

  it('should display active instances', async () => {
    renderInstanceSelection(mockStore, {
      instances: mockActiveInstances,
      onNewInstance: mockStartNewInstance,
    });

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
    renderInstanceSelection(mockStore, {
      instances: mockActiveInstances,
      onNewInstance: mockStartNewInstance,
    });

    await act(() => user.click(screen.getByText(/start på nytt/i)));
    expect(mockStartNewInstance).toBeCalledTimes(1);
  });

  it('should trigger openInstance on editButton click', async () => {
    renderInstanceSelection(mockStore, {
      instances: mockActiveInstances,
      onNewInstance: mockStartNewInstance,
    });
    const row = screen.getByRole('row', {
      name: /10\/05\/2021 navn navnesen fortsett her/i,
    });
    expect(window.location.href).toBe('https://local.altinn.cloud/ttd/test');

    const button = within(row).getByRole('button', {
      name: /fortsett her/i,
    });

    await act(() => user.click(button));
    expect(window.location.href).toBe('https://local.altinn.cloud/ttd/test#/instance/some-id');
  });

  it('should trigger openInstance on editButton click during mobile view', async () => {
    // Set screen size to mobile
    setScreenWidth(600);
    renderInstanceSelection(mockStore, {
      instances: mockActiveInstances,
      onNewInstance: mockStartNewInstance,
    });

    const row = screen.getByRole('row', {
      name: /Sist endret: 05\/13\/2021 Endret av: Kåre Nordmannsen/i,
    });
    expect(window.location.href).toBe('https://local.altinn.cloud/ttd/test#/instance/some-id');

    const button = within(row).getByRole('button', {
      name: /fortsett her/i,
    });

    await act(() => user.click(button));
    expect(window.location.href).toBe('https://local.altinn.cloud/ttd/test#/instance/some-other-id');
  });
});
