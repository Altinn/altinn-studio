import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { act } from 'react-dom/test-utils';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import DataModelling, { shouldSelectFirstEntry } from '../../../../features/dataModelling/DataModelling';
import { SchemaSelect, XSDUpload, Create, Delete } from '../../../../features/dataModelling/components';
import { LoadingState } from '../../../../features/dataModelling/sagas/metadata';

describe('Shared > DataModelling', () => {
  const language = { administration: Object({ first: 'some text', second: 'other text' }) };
  let wrapper: any = null;
  let store: any;
  const modelName = 'some-existing-model';
  const modelName2 = 'some-other-model';
  const initialState = {
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
  const dispatchMock = () => Promise.resolve({});
  const initialStoreCall = {
    type: 'dataModelling/fetchDataModel',
    payload: {
      metadata: {
        label: modelName,
        value: initialState.dataModelsMetadataState.dataModelsMetadata[0],
      },
    },
  };

  beforeEach(() => {
    wrapper = null;
    store = configureStore()(initialState);
    store.dispatch = jest.fn(dispatchMock);
  });

  const mountComponent = (props?: any) =>
    mount(
      React.createElement(
        () => (
          <Provider store={store}>
            <DataModelling language={language} org='test-org' repo='test-repo' />
          </Provider>
        ),
        props,
      ),
    );

  it('should fetch models on mount', () => {
    act(() => {
      mountComponent();
    });

    expect(store.dispatch).toHaveBeenCalledWith(initialStoreCall);
  });

  it('should show all items in the toolbar', () => {
    act(() => {
      wrapper = mountComponent();
    });

    expect(wrapper.find(XSDUpload).exists()).toBe(true);
    expect(wrapper.find(Create).exists()).toBe(true);
    expect(wrapper.find(SchemaSelect).exists()).toBe(true);
    expect(wrapper.find(Delete).exists()).toBe(true);
  });

  it('should dispatch dataModelsMetadata/getDataModelsMetadata when file is uploaded', () => {
    const uploadedFilename = 'uploaded.xsd';

    act(() => {
      wrapper = mountComponent();
    });

    wrapper.update();

    act(() => {
      wrapper.find(XSDUpload).props().onXSDUploaded(uploadedFilename);
    });

    wrapper.update();

    expect(store.dispatch).toHaveBeenLastCalledWith({
      type: 'dataModelsMetadata/getDataModelsMetadata',
      payload: undefined,
    });
  });

  it('should dispatch dataModelling/createDataModel when running createAction', () => {
    const newModel = { name: 'test' };

    act(() => {
      wrapper = mountComponent();
    });

    wrapper.update();

    act(() => {
      wrapper.find(Create).props().createAction(newModel);
    });

    expect(store.dispatch).toHaveBeenCalledTimes(2);
    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'dataModelling/createDataModel',
      payload: newModel,
    });
  });

  it('should dispatch dataModelsMetadata/getDataModelsMetadata when delete is called', () => {
    act(() => {
      wrapper = mountComponent();
    });

    wrapper.update();

    act(() => {
      wrapper.find(Delete).props().deleteAction();
    });

    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'dataModelling/deleteDataModel',
      payload: initialStoreCall.payload,
    });
  });

  describe('Shared > DataModelling > shouldSelectFirstEntry', () => {
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
});
