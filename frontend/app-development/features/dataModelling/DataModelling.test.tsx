import React from 'react';
import { DataModelling } from './DataModelling';
import { render as rtlRender, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { LOCAL_STORAGE_KEY, setLocalStorageItem } from '@altinn/schema-editor/utils/localStorage';
import { textMock } from '../../../testing/mocks/i18nMock';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { jsonMetadata1Mock } from '../../../packages/schema-editor/test/mocks/metadataMocks';
import { QueryClient } from '@tanstack/react-query';

// workaround for https://jestjs.io/docs/26.x/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

const org = 'org';
const app = 'app';

// Mocks:
const getDatamodel = jest.fn().mockImplementation(() => Promise.resolve({}));
const getDatamodels = jest.fn().mockImplementation(() => Promise.resolve([]));
const getDatamodelsXsd = jest.fn().mockImplementation(() => Promise.resolve([]));

const render = (queryClient: QueryClient = createQueryClientMock()) => {

  const queries: ServicesContextProps = {
    ...queriesMock,
    getDatamodel,
    getDatamodels,
    getDatamodelsXsd
  };

  return rtlRender(
    <ServicesContextProvider {...queries} client={queryClient}>
      <DataModelling/>
    </ServicesContextProvider>
  );
};


describe('DataModelling', () => {
  afterEach(jest.clearAllMocks);

  it('should fetch models on mount', () => {
    render();
    expect(getDatamodels).toHaveBeenCalledTimes(1);
    expect(getDatamodelsXsd).toHaveBeenCalledTimes(1);
  });

  it('Should show info dialog by default when loading the page', () => {
    // make sure setting to turn off info dialog is cleared
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.DatamodelsMetadata, org, app], []);
    render(queryClient);
    const dialogHeader = screen.getByRole('heading', { name: textMock('schema_editor.info_dialog_title') });
    expect(dialogHeader).toBeInTheDocument();
  });

  it('should display no data-models message when schema is undefined and loadState is loaded', async () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.DatamodelsMetadata, org, app], [jsonMetadata1Mock]);
    render(queryClient);
    const dialogHeader = screen.getByRole('heading', { name: textMock('schema_editor.info_dialog_title') });
    expect(dialogHeader).toBeInTheDocument();
  });

  it('Should not show info dialog when loading the page if user has asked to not show it again', () => {
    // make sure setting to turn off info dialog is set
    setLocalStorageItem('hideIntroPage', true);
    render();
    const dialogHeader = screen.queryByRole('heading', { name: textMock('schema_editor.info_dialog_title') });
    expect(dialogHeader).not.toBeInTheDocument();
  });

  it('Should show start dialog when no models are present and intro page is closed', () => {
    // make sure setting to turn off info dialog is set
    setLocalStorageItem('hideIntroPage', true);
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.DatamodelsMetadata, org, app], []);
    render(queryClient);
    const dialogHeader = screen.getByRole('heading', { name: textMock('app_data_modelling.landing_dialog_header') });
    expect(dialogHeader).toBeInTheDocument();
  });

  it('Should not show start dialog when the models have not been loaded yet', () => {
    // make sure setting to turn off info dialog is set
    setLocalStorageItem('hideIntroPage', true);
    render();
    expect(screen.getByTitle(textMock('general.loading'))).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: textMock('app_data_modelling.landing_dialog_header') })).not.toBeInTheDocument();
  });

  it('Should not show start dialog when there are models present', async () => {
    // make sure setting to turn off info dialog is set
    setLocalStorageItem('hideIntroPage', true);
    getDatamodels.mockImplementation(() => Promise.resolve([jsonMetadata1Mock]));
    render();
    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));
    expect(screen.queryByRole('heading', { name: textMock('app_data_modelling.landing_dialog_header') })).not.toBeInTheDocument();
  });
});
