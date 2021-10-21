import { render } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import InstanceSelection from '../../../src/features/instantiate/containers/InstanceSelection';
import { IRuntimeState, ISimpleInstance } from '../../../src/types';
import { getInitialStateMock } from '../../../__mocks__/initialStateMock';

describe('>>> features/instantiate/InstanceSelection.tsx', () => {
  let mockInitialState: IRuntimeState;
  let mockStore: any;
  let mockStartNewInstance: () => void;
  let mockActiveInstances: ISimpleInstance[];

  beforeEach(() => {
    const createStore = configureStore();
    mockInitialState = getInitialStateMock({});
    mockStore = createStore(mockInitialState);
    mockStartNewInstance = jest.fn();
    mockActiveInstances = [
      {
        id: 'some-id', lastChanged: '2021-10-05T07:51:57.8795258Z', lastChangedBy: 'Navn Navnesen',
      },
      {
        id: 'some-other-id', lastChanged: '2021-05-13T07:51:57.8795258Z', lastChangedBy: 'Kåre Nordmannsen',
      },
    ];
  });

  it('should show full size table for larger devices', () => {
    const rendered = render(
      <Provider store={mockStore}>
        <InstanceSelection
          instances={mockActiveInstances}
          onNewInstance={mockStartNewInstance}
        />
      </Provider>,
    );
    const altinnTable = rendered.container.querySelector('#instance-selection-table');
    expect(altinnTable).not.toBeNull();
  });

  it('should display mobile table for smaller devices', () => {
    (window as any).matchMedia = jest.fn().mockReturnValue({
      matches: true,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    });
    const rendered = render(
      <Provider store={mockStore}>
        <InstanceSelection
          instances={mockActiveInstances}
          onNewInstance={mockStartNewInstance}
        />
      </Provider>,
    );
    const altinnMobileTable = rendered.container.querySelector('#instance-selection-mobile-table');
    expect(altinnMobileTable).not.toBeNull();
  });

  it('should display active instances', async () => {
    const rendered = render(
      <Provider store={mockStore}>
        <InstanceSelection
          instances={mockActiveInstances}
          onNewInstance={mockStartNewInstance}
        />
      </Provider>,
    );

    const firstInstanceChangedBy = await rendered.findByText(mockActiveInstances[0].lastChangedBy);
    const secondInstanceChangedBy = await rendered.findByText(mockActiveInstances[1].lastChangedBy);

    const firstInstanceLastChanged = await rendered.findByText('10/05/2021');
    const secondInstanceLastChanged = await rendered.findByText('05/13/2021');

    expect(firstInstanceChangedBy).not.toBeNull();
    expect(secondInstanceChangedBy).not.toBeNull();

    expect(firstInstanceLastChanged).not.toBeNull();
    expect(secondInstanceLastChanged).not.toBeNull();
  });

  it('pressing "Start på nytt" should trigger callback', () => {
    const rendered = render(
      <Provider store={mockStore}>
        <InstanceSelection
          instances={mockActiveInstances}
          onNewInstance={mockStartNewInstance}
        />
      </Provider>,
    );

    rendered.getByText('Start på nytt').click();
    expect(mockStartNewInstance).toBeCalledTimes(1);
  });
});
