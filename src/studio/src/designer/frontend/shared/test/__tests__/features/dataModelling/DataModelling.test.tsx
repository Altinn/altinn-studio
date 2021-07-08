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
    },
    dataModelling: {
      schema: {},
      saving: false,
    },
  };
  const dispatchMock = () => Promise.resolve({});
  let preferredLabel: {label: string, clear: () => void} = null;
  const clear = jest.fn();

  beforeEach(() => {
    wrapper = null;
    preferredLabel = null;
    store = configureStore()(initialState);
    store.dispatch = jest.fn(dispatchMock);
    clear.mockReset();
  });
  // eslint-disable-next-line react/jsx-props-no-spreading
  const dummyComponent = (props: {
    schema: any;
    language: any;
    name?: string;
    onSaveSchema: () => {}
  }) => (<div>{JSON.stringify(props)}</div>);
  const mountComponent = (props?: any) => mount(
    React.createElement(({ preferredOptionLabel }: any = {}) => (
      <Provider store={store} >
        <DataModelling
          language={language}
          SchemaEditor={dummyComponent}
          preferredOptionLabel={preferredOptionLabel || undefined}
        />
      </Provider>
    ), props),
  );
  it('should match snapshot', () => {
    wrapper = mount(
      <Provider store={store} >
        <DataModelling
          language={language}
          SchemaEditor={dummyComponent}
        />
      </Provider>,
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  it('has the toolbar', () => {
    act(() => {
      wrapper = mountComponent(undefined);
    });
    const createNewWrapper = wrapper.find(CreateNewWrapper);
    expect(createNewWrapper).toHaveLength(1);
    const schemaSelect = wrapper.find(SchemaSelect);
    expect(schemaSelect).toHaveLength(1);
    const deleteWrapper = wrapper.find(DeleteWrapper);
    expect(deleteWrapper).toHaveLength(1);
  });

  it('selects the preferred model', () => {
    preferredLabel = { label: modelName2, clear };
    expect(clear).toHaveBeenCalledTimes(0);
    act(() => {
      wrapper = mountComponent({ preferredOptionLabel: preferredLabel });
    });
    wrapper.update();
    expect(clear).toHaveBeenCalledTimes(1);
    const schemaSelect = wrapper.find(SchemaSelect);
    expect(schemaSelect).toHaveLength(1);
    const dataModelling = wrapper.find(DataModelling);
    expect(dataModelling).toHaveLength(1);
    expect(schemaSelect.find('Select').props().value.label).toBe(modelName2);
    expect(dataModelling.find('dummyComponent').props().name).toBe(modelName2);
  });

  it('does not run clear after preferred model has been selected', () => {
    expect(clear).toHaveBeenCalledTimes(0);
    preferredLabel = { label: modelName2,
      clear: () => {
        preferredLabel = undefined; // note that a clear function should set state that causes the preferred label
        clear();
      } };
    act(() => {
      wrapper = mountComponent({ preferredOptionLabel: preferredLabel });
    });
    wrapper.update();
    expect(preferredLabel).toBeUndefined(); // the clear function has removed the outside prop
    act(() => { // update the props to reflect changes in outside props.
      wrapper.setProps({
        preferredOptionLabel: preferredLabel,
      });
    });
    // assert the state and do changes.
    let dataModelling = wrapper.find(DataModelling);
    const schemaSelect = wrapper.find(SchemaSelect);
    const select = schemaSelect.find('Select');
    let schemaEditor = dataModelling.find('dummyComponent');
    expect(schemaEditor.props().name).toBe(modelName2);
    const options = select.props().options;
    act(() => {
      select.props().onChange(options[0]); // change the selection to invoke possible calls to clear
    });
    wrapper.update(); // update selectors
    dataModelling = wrapper.find(DataModelling);
    schemaEditor = dataModelling.find('dummyComponent');
    expect(clear).toHaveBeenCalledTimes(1);
    expect(schemaEditor.props().name).toBe(modelName);
  });
});
