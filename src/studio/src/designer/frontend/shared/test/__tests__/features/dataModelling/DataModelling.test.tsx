import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { act } from 'react-dom/test-utils';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import toJson from 'enzyme-to-json';
import DataModelling from '../../../../features/dataModelling';
import CreateNewWrapper from '../../../../features/dataModelling/components/CreateNewWrapper';
import { SchemaSelect } from '../../../../features/dataModelling/components';
import DeleteWrapper from '../../../../features/dataModelling/components/DeleteWrapper';

describe('>>> DataModelling.tsx', () => {
  const language = { administration: {} };
  let wrapper: any = null;
  let store: any;
  const modelName = 'some-existing-model';
  const initialState = {
    dataModelsMetadataState: {
      dataModelsMetadata: [
        {
          repositoryRelativeUrl: `/App/models/${modelName}.schema.json`,
          fileName: `${modelName}.schema.json`,
          fileType: '.json',
          fileStatus: 0,
          lastChanged: '2021-06-22T10:49:02.8440678+02:00',
        },
      ],
    },
    dataModelling: {
      schema: {},
      saving: false,
    },
  };
  const dispatchMock = () => Promise.resolve({});

  beforeEach(() => {
    wrapper = null;
    store = configureStore()(initialState);
    store.dispatch = jest.fn(dispatchMock);
  });
  // eslint-disable-next-line react/jsx-props-no-spreading
  const dummyComponent = (props: { schema: any;
    language: any;
    rootItemId?: string;
    onSaveSchema: () => {} }) => (<div>{JSON.stringify(props)}</div>);
  const mountComponent = () => mount(
    <Provider store={store} >
      <DataModelling
        language={language}
        SchemaEditor={dummyComponent}
      />
    </Provider>,
  );

  it('should match snapshot', () => {
    wrapper = mountComponent();
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  it('has the toolbar', () => {
    act(() => {
      wrapper = mountComponent();
    });
    const createNewWrapper = wrapper.find(CreateNewWrapper);
    expect(createNewWrapper).toHaveLength(1);
    const schemaSelect = wrapper.find(SchemaSelect);
    expect(schemaSelect).toHaveLength(1);
    const deleteWrapper = wrapper.find(DeleteWrapper);
    expect(deleteWrapper).toHaveLength(1);
  });
});
