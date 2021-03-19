/* tslint:disable:jsx-wrap-multiline */
// import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';

import DataModelingContainer from '../../features/dataModeling/containers/DataModelingContainer';
import { mount } from 'enzyme';

describe('DataModeling', () => {

  const mockLanguage = { administration: {} };
  const initialState = {
    applicationMetadataState: {
      applicationMetadata: {
        dataTypes: [
          {
            id: 'ref-data-as-pdf',
            allowedContentTypes: [
              'application/pdf'
            ],
            maxCount: 0,
            minCount: 0
          }
        ]
      }
    },
    dataModeling: {
      schema: {},
      modelName: 'test',
      saving: false,
    }
  }
  let mockStore: any;
  const dispatchMock = () => Promise.resolve({});
  beforeEach(() => {
    mockStore = configureStore()(initialState);
    mockStore.dispatch = jest.fn(dispatchMock);

  });

  it('Should match snapshot', () => {
    const wrapper = renderer.create(
      <Provider store={mockStore}>
        <DataModelingContainer language={mockLanguage} />
      </Provider>
    );
    expect(wrapper).toMatchSnapshot();
  });


  it('dispatches correctly when clicking new', () => {
    let wrapper: any = null;
    // act(() => {
     wrapper = mount(
        <Provider store={mockStore}>
          <DataModelingContainer language={mockLanguage} />
        </Provider>,
        { context: { store: mockStore } }
      );
    // });
    
    expect(wrapper).not.toBeNull();

    expect(wrapper.find('input').length).toBe(1);
    expect(wrapper.find('button').length).toBe(3);
    wrapper.find('#new-button').at(0).simulate('click');
    expect(wrapper.find('input').length).toBe(2);
    
    wrapper.find('input').last().simulate('change', { target: { value: 'test' }});
    expect(wrapper.find('button').length).toBe(4);

    wrapper.find('#newModelInput').find('button').simulate('click')
    
    expect(mockStore.dispatch).toHaveBeenCalledWith({
      type: "dataModeling/createNewDataModel",
      payload: {
        modelName: 'test'
      }
    });
  });

});


