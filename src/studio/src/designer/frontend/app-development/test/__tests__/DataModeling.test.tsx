/* tslint:disable:jsx-wrap-multiline */
// import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';

import DataModelingContainer from '../../features/dataModeling/containers/DataModelingContainer';

describe('DataModeling', () => {

/*

 {
          id: 'test',
          allowedContentTypes: [
            'application/xml'
          ],
          appLogic: {
            autoCreate: true,
            classRef: 'Altinn.App.Models.Foretak'
          },
          maxCount: 1,
          minCount: 1
        }

        */
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

  beforeEach(() => {
    mockStore = configureStore()(initialState);
  });

  it('Should match snapshot', () => {
    const wrapper = renderer.create(
      <Provider store={mockStore}>
        <DataModelingContainer/>
      </Provider>
    );
    expect(wrapper).toMatchSnapshot();
    });
});


