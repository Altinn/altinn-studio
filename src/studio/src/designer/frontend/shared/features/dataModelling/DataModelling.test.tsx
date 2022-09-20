import React from 'react';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import DataModelling, { shouldSelectFirstEntry } from './DataModelling';
import { LoadingState } from './sagas/metadata';
import { render as rtlRender, screen } from '@testing-library/react';

// workaround for https://jestjs.io/docs/26.x/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
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
const defaultInitialState = {
  dataModelsMetadataState: {
    dataModelsMetadata: [
      {
        repositoryRelativeUrl: `/App/models/${modelName}.schema.json`,
        fileName: `${modelName}.schema.json`,
        fileType: '.json',
      },
      {
        repositoryRelativeUrl: `/App/models/${modelName2}.schema.json`,
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
const initialStoreCall = {
  type: 'dataModelling/fetchDataModel',
  payload: {
    metadata: {
      label: modelName,
      value: defaultInitialState.dataModelsMetadataState.dataModelsMetadata[0],
    },
  },
};

describe('DataModelling', () => {
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
              },
            },
          ],
          selectedOption: undefined,
          metadataLoadingState: LoadingState.ModelsLoaded,
        }),
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
              },
            },
          ],
          selectedOption: {
            label: 'some-label',
          },
          metadataLoadingState: LoadingState.ModelsLoaded,
        }),
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
              },
            },
          ],
          selectedOption: undefined,
          metadataLoadingState: LoadingState.LoadingModels,
        }),
      ).toBe(false);
    });

    it('should return false when metadataOptions not set, selectedOption is undefined and metadataLoadingState is ModelsLoaded', () => {
      expect(
        shouldSelectFirstEntry({
          selectedOption: undefined,
          metadataLoadingState: LoadingState.ModelsLoaded,
        }),
      ).toBe(false);
    });

    it('should return false when metadataOptions is 0, selectedOption is undefined and metadataLoadingState is ModelsLoaded', () => {
      expect(
        shouldSelectFirstEntry({
          metadataOptions: [],
          selectedOption: undefined,
          metadataLoadingState: LoadingState.ModelsLoaded,
        }),
      ).toBe(false);
    });
  });

  it('Should show info dialog by default when loading the page', () => {
    // make sure setting to turn off info dialog is cleared
    localStorage.removeItem('datamodelLocalStorage');
    render();
    const dialogHeader = screen.queryByText('schema_editor.info_dialog_title');
    expect(dialogHeader).toBeInTheDocument();
  });

  it('Should not show info dialog when loading the page if user has asked to not show it again', () => {
    // make sure setting to turn off info dialog is set
    localStorage.setItem('datamodelLocalStorage', JSON.stringify({ hideIntroPage: true}));
    render();
    const dialogHeader = screen.queryByText('schema_editor.info_dialog_title');
    expect(dialogHeader).not.toBeInTheDocument();
  });

  it('Should show start dialog when no models are present and intro page is closed', () => {
    // make sure setting to turn off info dialog is set
    localStorage.setItem('datamodelLocalStorage', JSON.stringify({ hideIntroPage: true}));
    render();
    expect(screen.queryByText('Dialog header')).toBeInTheDocument();
  });

  it('Should not show start dialog when the models have not been loaded yet', () => {
    // make sure setting to turn off info dialog is set
    localStorage.setItem('datamodelLocalStorage', JSON.stringify({ hideIntroPage: true}));
    render({ dataModelsMetadataState: { loadState: LoadingState.LoadingModels } });
    expect(screen.queryByText('Dialog header')).not.toBeInTheDocument();
  });

  it('Should not show start dialog when the models have not been loaded yet', () => {
    // make sure setting to turn off info dialog is set
    localStorage.setItem('datamodelLocalStorage', JSON.stringify({ hideIntroPage: true}));
    render({ dataModelsMetadataState: { loadState: LoadingState.LoadingModels } });
    expect(screen.queryByText('Dialog header')).not.toBeInTheDocument();
  });

  it('Should not show start dialog when there are models present', () => {
    // make sure setting to turn off info dialog is set
    localStorage.setItem('datamodelLocalStorage', JSON.stringify({ hideIntroPage: true}));
    const schema = {
      properties: { SomeSchema: { $ref: '#/definitions/Something' } },
      definitions: { Something: { type: 'string' } }
    };
    render({ dataModelling: { schema } });
    expect(screen.queryByText('Dialog header')).not.toBeInTheDocument();
  });
});

const render = (state: {[K in keyof typeof defaultInitialState]?: Partial<typeof defaultInitialState[K]>} = {}) => {

  const dataModelsMetadataState = state?.dataModelsMetadataState;
  const dataModelling = state?.dataModelling;

  const initialState = {
    dataModelsMetadataState: {
      ...defaultInitialState.dataModelsMetadataState,
      ...dataModelsMetadataState
    },
    dataModelling: {
      ...defaultInitialState.dataModelling,
      ...dataModelling
    }
  };

  const store = configureStore()(initialState);
  store.dispatch = jest.fn();

  rtlRender(
    <Provider store={store}>
      <DataModelling
        language={{
          administration: {
            first: 'some text',
            second: 'other text',
          },
          app_data_modelling: {
            landing_dialog_header: 'Dialog header'
          }
        }}
        org='test-org'
        repo='test-repo'
      />
    </Provider>,
  );

  return { store };
};
