import React from 'react';
import { act, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { ItemMetadataTab } from './ItemMetadataTab';
import {
  ServicesContextProvider,
  type ServicesContextProps,
} from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { DataType } from 'app-shared/types/DataType';
import userEvent from '@testing-library/user-event';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import { app, org } from '@studio/testing/testids';

jest.mock('app-shared/hooks/useStudioEnvironmentParams', () => ({
  useStudioEnvironmentParams: () => ({ org, app }),
}));

describe('ItemMetadataTab', () => {
  it('should render correctly', async () => {
    render({});
    await waitForLoadingToFinish();
    expect(maxCountSpinButton()).toBeInTheDocument();
    expect(minCountSpinButton()).toBeInTheDocument();
  });

  it('should show "no metadata" if datatype is not present on datamodel', async () => {
    render({ dataType: null });
    await waitForLoadingToFinish();
    expect(noMetadataErrorMessage()).toBeInTheDocument();
  });

  it('should call mutation editing fields', async () => {
    const user = userEvent.setup({ delay: null });
    jest.useFakeTimers();
    const dataType: DataType = {
      maxCount: 0,
      minCount: 0,
      appLogic: {
        autoCreate: false,
      },
    };
    const updateDataType = jest.fn(() => Promise.resolve());
    render({
      dataType,
      queries: {
        updateDataType: updateDataType,
      },
    });
    await waitForLoadingToFinish();

    await user.type(maxCountSpinButton(), '5');
    await waitForDebounce();
    expect(updateDataType).toHaveBeenCalledTimes(1);
    expect(updateDataType).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      {
        ...dataType,
        maxCount: 5,
      },
    );

    await user.clear(maxCountSpinButton());
    await user.type(maxCountSpinButton(), '3');
    await user.type(minCountSpinButton(), '2');
    await user.click(autoCreateSwitch());
    await waitForDebounce();
    expect(updateDataType).toHaveBeenCalledTimes(2);
    expect(updateDataType).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      {
        appLogic: {
          autoCreate: true,
        },
        minCount: 2,
        maxCount: 3,
      },
    );
  });
});

const waitForLoadingToFinish = async () => {
  await waitForElementToBeRemoved(screen.queryByText(/general\.loading/i));
};

const waitForDebounce = async () => {
  await act(async () => {
    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS);
  });
};

type renderProps = {
  dataType?: DataType;
  queries?: Partial<ServicesContextProps>;
};

const render = ({ dataType = {}, queries }: renderProps) => {
  const queryClient = createQueryClientMock();
  queries = {
    getDataType: jest.fn(() => Promise.resolve(dataType)),
    ...queries,
  };

  return renderWithProviders({})(
    <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
      <ItemMetadataTab />
    </ServicesContextProvider>,
  );
};

// DOM queries
const maxCountSpinButton = () =>
  screen.getByRole('spinbutton', { name: /schema_editor\.metadata\.maxCount/i });
const minCountSpinButton = () =>
  screen.getByRole('spinbutton', { name: /schema_editor\.metadata\.minCount/i });
const autoCreateSwitch = () =>
  screen.getByRole('switch', { name: /schema_editor\.metadata\.autoCreate/i });
const noMetadataErrorMessage = () => screen.getByText(/schema_editor.metadata.not_found/);
