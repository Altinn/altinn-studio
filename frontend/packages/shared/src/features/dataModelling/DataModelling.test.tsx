import React from 'react';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { DataModelling, shouldSelectFirstEntry } from './DataModelling';
import { LoadingState } from './sagas/metadata';
import { render as rtlRender, screen } from '@testing-library/react';
import { LOCAL_STORAGE_KEY, setLocalStorageItem } from './functions/localStorage';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { JsonSchema } from 'app-shared/types/JsonSchema';
import { QueryKey } from 'app-shared/types/QueryKey';
import { uiSchemaMock } from '../../../../schema-model/test/uiSchemaMock';

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

const modelName = 'some-existing-model';
const modelName2 = 'some-other-model';
const modelPath = `/App/models/${modelName}.schema.json`;
const modelPath2 = `/App/models/${modelName2}.schema.json`;
  const defaultInitialState = {
  dataModelsMetadataState: {
    dataModelsMetadata: [
      {
        repositoryRelativeUrl: modelPath,
        fileName: `${modelName}.schema.json`,
        fileType: '.json',
      },
      {
        repositoryRelativeUrl: modelPath2,
        fileName: `${modelName2}.schema.json`,
        fileType: '.json',
      },
    ],
    loadState: LoadingState.ModelsLoaded,
  },
  dataModelling: {
    schema: {},
    saving: false,
  },
};
const org = 'org';
const app = 'app';
const initialStoreCall = {
  type: 'dataModelling/fetchDataModel',
  payload: {
    metadata: {
      label: modelName,
      value: defaultInitialState.dataModelsMetadataState.dataModelsMetadata[0],
    },
    org,
    app,
  },
};

// Mocks:
const getDatamodel = jest.fn().mockImplementation(() => Promise.resolve({}));

const render = (
  state: {
    [K in keyof typeof defaultInitialState]?: Partial<(typeof defaultInitialState)[K]>;
  } = {},
  modelResponse: JsonSchema = {},
) => {
  const dataModelsMetadataState = state?.dataModelsMetadataState;

  const initialState = {
    dataModelsMetadataState: {
      ...defaultInitialState.dataModelsMetadataState,
      ...dataModelsMetadataState,
    },
    dataModelling: {
      ...defaultInitialState.dataModelling,
    },
  };

  const store = configureStore()(initialState);
  store.dispatch = jest.fn();

  const queries = {
    ...queriesMock,
    getDatamodel,
  };

  rtlRender(
    <ServicesContextProvider {...queries} client={queryClientMock}>
      <Provider store={store}>
        <DataModelling org={org} repo={app}/>
      </Provider>
    </ServicesContextProvider>
  );

  return { store };
};


describe('DataModelling', () => {
  afterEach(jest.clearAllMocks);

  it('should fetch models on mount', () => {
    const { store } = render();

    expect(store.dispatch).toHaveBeenCalledWith(initialStoreCall);
  });

  describe('shouldSelectFirstEntry', () => {
    it('should return true when metadataOptions.length is greater than 0, selectedOption is undefined and metadataLoadingState is ModelsLoaded', () => {
      expect(
        shouldSelectFirstEntry({
          metadataOptions: [
            {
              label: 'option 1',
              value: {
                repositoryRelativeUrl: '',
                fileName: 'option 1.xsd',
                fileType: '.xsd',
              },
            },
          ],
          selectedOption: undefined,
          metadataLoadingState: LoadingState.ModelsLoaded,
        })
      ).toBe(true);
    });

    it('should return false when metadataOptions.length is greater than 0, selectedOption is set and metadataLoadingState is ModelsLoaded', () => {
      expect(
        shouldSelectFirstEntry({
          metadataOptions: [
            {
              label: 'option 1',
              value: {
                repositoryRelativeUrl: '',
                fileName: 'option 1.xsd',
                fileType: '.xsd',
              },
            },
          ],
          selectedOption: {
            label: 'some-label',
          },
          metadataLoadingState: LoadingState.ModelsLoaded,
        })
      ).toBe(false);
    });

    it('should return false when metadataOptions.length is greater than 0, selectedOption is undefined and metadataLoadingState is not ModelsLoaded', () => {
      expect(
        shouldSelectFirstEntry({
          metadataOptions: [
            {
              label: 'option 1',
              value: {
                repositoryRelativeUrl: '',
                fileName: 'option 1.xsd',
                fileType: '.xsd',
              },
            },
          ],
          selectedOption: undefined,
          metadataLoadingState: LoadingState.LoadingModels,
        })
      ).toBe(false);
    });

    it('should return false when metadataOptions not set, selectedOption is undefined and metadataLoadingState is ModelsLoaded', () => {
      expect(
        shouldSelectFirstEntry({
          selectedOption: undefined,
          metadataLoadingState: LoadingState.ModelsLoaded,
        })
      ).toBe(false);
    });

    it('should return false when metadataOptions is 0, selectedOption is undefined and metadataLoadingState is ModelsLoaded', () => {
      expect(
        shouldSelectFirstEntry({
          metadataOptions: [],
          selectedOption: undefined,
          metadataLoadingState: LoadingState.ModelsLoaded,
        })
      ).toBe(false);
    });
  });

  it('Should show info dialog by default when loading the page', () => {
    // make sure setting to turn off info dialog is cleared
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    render();
    const dialogHeader = screen.queryByText(textMock('schema_editor.info_dialog_title'));
    expect(dialogHeader).toBeInTheDocument();
  });

  it('should display no data-models message when schema is undefined and loadState is loaded', async () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    render({
      dataModelsMetadataState: { loadState: LoadingState.ModelsLoaded },
    });
    const dialogHeader = screen.queryByText(textMock('schema_editor.info_dialog_title'));
    expect(dialogHeader).toBeInTheDocument();
  });

  it('Should not show info dialog when loading the page if user has asked to not show it again', () => {
    // make sure setting to turn off info dialog is set
    setLocalStorageItem('hideIntroPage', true);
    render();
    const dialogHeader = screen.queryByText('schema_editor.info_dialog_title');
    expect(dialogHeader).not.toBeInTheDocument();
  });

  it('Should show start dialog when no models are present and intro page is closed', () => {
    // make sure setting to turn off info dialog is set
    setLocalStorageItem('hideIntroPage', true);
    render();
    expect(screen.getByText(textMock('app_data_modelling.landing_dialog_header'))).toBeInTheDocument();
  });

  it('Should not show start dialog when the models have not been loaded yet', () => {
    // make sure setting to turn off info dialog is set
    setLocalStorageItem('hideIntroPage', true);
    render({
      dataModelsMetadataState: { loadState: LoadingState.LoadingModels },
    });
    expect(screen.queryByText(textMock('app_data_modelling.landing_dialog_header'))).not.toBeInTheDocument();
  });

  it('Should not show start dialog when the models have not been loaded yet', () => {
    // make sure setting to turn off info dialog is set
    setLocalStorageItem('hideIntroPage', true);
    render({
      dataModelsMetadataState: { loadState: LoadingState.LoadingModels },
    });
    expect(screen.queryByText(textMock('app_data_modelling.landing_dialog_header'))).not.toBeInTheDocument();
  });

  it('Should not show start dialog when there are models present', () => {
    // make sure setting to turn off info dialog is set
    setLocalStorageItem('hideIntroPage', true);
    queryClientMock.setQueryData([QueryKey.Datamodel, org, app, modelPath], uiSchemaMock)
    render();
    expect(screen.queryByText(textMock('app_data_modelling.landing_dialog_header'))).not.toBeInTheDocument();
  });
});
