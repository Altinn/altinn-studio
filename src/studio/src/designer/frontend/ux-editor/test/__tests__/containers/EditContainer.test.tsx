
// import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';
import { EditContainer } from '../../../containers/EditContainer';

describe('>>> containers/EditContainer', () => {
  let mockId: string;
  let mockComponent: any;
  let mockHandleActiveListChange: (obj: any) => any;
  let mockStore: any;

  beforeEach(() => {
    const createStore = configureStore();
    const initialState = {
      appData: {
        languageState: {
          language: {
            ux_editor: {
              modal_properties_data_model_helper: 'Lenke til datamodell',
            },
            general: {
              for: 'for',
            },
          },
        },
        dataModel: {
          model: [] as any[],
        },
        textResources: {
          resources: [{ id: 'ServiceName', value: 'Test' }],
        },
        codeLists: {
          codeLists: [] as any[],
        },
      },
      formDesigner: {
        layout: {
          activeList: [{
            firstInActiveList: true,
            id: '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88',
            inEditMode: true,
            lastInActiveList: true,
          }],
          layouts: {
            default: {
              order: {
                'd70339c4-bb2d-4c09-b786-fed3622d042c': [
                  '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88',
                ],
              },
              components: {
                '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88': {
                  id: '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88',
                  dataModelBindings: {},
                  readOnly: false,
                  required: false,
                  textResourceBindings: {
                    title: 'Input',
                  },
                  type: 'Input',
                },
              },
            },
          },
          selectedLayout: 'default',
        },
      },
      serviceConfigurations: {
        APIs: {
          availableCodeLists: null as any,
          connections: null as any,
        },
      },
      thirdPartyComponents: {
        components: null as any,
      },
    };

    mockId = '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88';
    mockComponent = {
      id: '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88',
      dataModelBindings: {},
      readOnly: false,
      required: false,
      textResourceBindings: {
        title: 'Input',
      },
      type: 'Input',
    };
    mockHandleActiveListChange = () => {};
    mockStore = createStore(initialState);
  });
  it('>>> Capture snapshot of EditContainer', () => {
    const rendered = renderer.create(
      <Provider store={mockStore}>
        <EditContainer
          component={mockComponent}
          id={mockId}
          firstInActiveList={false}
          lastInActiveList={false}
          sendItemToParent={mockHandleActiveListChange}
          singleSelected={false}
        >
          <div />
        </EditContainer>
      </Provider>,
    );
    expect(rendered).toMatchSnapshot();
  });
});
