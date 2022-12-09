import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { screen } from '@testing-library/react';
import axios from 'axios';

import { getInitialStateMock, getInstanceDataStateMock } from 'src/__mocks__/mocks';
import { App } from 'src/App';
import * as appSelector from 'src/common/hooks/useAppSelector';
import * as anonymousSelector from 'src/selectors/getAllowAnonymous';
import { renderWithProviders } from 'src/testUtils';
import { ProcessTaskType } from 'src/types';
import type { IRuntimeState } from 'src/types';

describe('App', () => {
  const get = jest.spyOn(axios, 'get');
  const actualUseAppSelector = appSelector.useAppSelector;
  const useAppSelector = jest.spyOn(appSelector, 'useAppSelector');
  useAppSelector.mockImplementation((arg: ((state: IRuntimeState) => unknown) | 'allowAnonymousSelector') => {
    if (arg === 'allowAnonymousSelector') {
      return getAllowAnonymous();
    } else return actualUseAppSelector(arg);
  });
  const makeGetAllowAnonymousSelector = jest.spyOn(anonymousSelector, 'makeGetAllowAnonymousSelector');
  let allowAnonymous: boolean | undefined = undefined;
  const getAllowAnonymous = () => allowAnonymous;
  beforeEach(() => {
    allowAnonymous = undefined;
  });
  afterEach(() => {
    useAppSelector.mockClear();
    get.mockClear();
    allowAnonymous = undefined;
  });

  const ProvidedRouter = ({ locationPath }) => {
    return (
      <MemoryRouter
        basename={'/ttd/test'}
        initialEntries={[`/ttd/test${locationPath}`]}
      >
        <App />
      </MemoryRouter>
    );
  };

  const render = ({ locationPath }: { locationPath: string }) => {
    const commonState = { isDone: null, error: null };
    const initialState = {
      dataTask: { ...commonState },
      appTask: { ...commonState },
      userTask: { ...commonState },
      infoTask: { ...commonState },
      stateless: { ...commonState },
    };
    return renderWithProviders(<ProvidedRouter locationPath={locationPath} />, {
      preloadedState: {
        ...getInitialStateMock({
          queue: initialState,
        }),
        instanceData: getInstanceDataStateMock(),
        process: {
          error: null,
          taskId: 'Task1',
          taskType: ProcessTaskType.Data,
        },
      },
    });
  };
  const mockInstanceId = '123456/75154373-aed4-41f7-95b4-e5b5115c2edc';
  const mockAllowAnonymousState = (state: boolean) => {
    allowAnonymous = state;
    makeGetAllowAnonymousSelector.mockReturnValue('allowAnonymousSelector');
  };
  it('should get to the presentation component on an instance api', () => {
    mockAllowAnonymousState(false);
    (axios.get as jest.Mock).mockImplementation(() => {
      return {};
    });
    const locationPath = `/instance/${mockInstanceId}`;
    render({
      locationPath,
    });
    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/authentication/keepAlive'), {
      headers: { Pragma: 'no-cache' },
    });
    expect(screen.getByTestId('presentation-heading')).toBeInTheDocument();
  });
  it('should try to presentation component when anonymous', () => {
    mockAllowAnonymousState(true);
    render({
      locationPath: `/`,
    });
    expect(screen.getByTestId('presentation-heading')).toBeInTheDocument();
  });
  it('should render 403 error in party selection', () => {
    mockAllowAnonymousState(false);
    render({
      locationPath: `/partyselection/403`,
    });
    expect(screen.getByTestId('error-code-403')).toBeInTheDocument();
  });
  it('should render the party selection without error', () => {
    mockAllowAnonymousState(false);
    render({
      locationPath: `/partyselection`,
    });
    expect(screen.getByTestId('AltinnParty-partyIcon')).toBeInTheDocument();
    expect(screen.queryByTestId(/error-code-/g)).toBeNull();
  });
});
