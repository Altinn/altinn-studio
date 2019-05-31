/* tslint:disable:jsx-wrap-multiline */
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';
import FormDesignerActionDispatchers from '../../src/actions/formDesignerActions/formDesignerActionDispatcher';
import { EditContainer } from '../../src/containers/EditContainer';

describe('>>> containers/EditContainer', () => {
  let mockId: string;
  let mockComponent: any;
  let mockHandleActiveListChange: (obj: any) => any;
  let mockStore: any;

  beforeEach(() => {
    const createStore = configureStore();
    const initialState = {
      appData: {
        language: {
          language: {},
        },
        dataModel: {
          model: [] as any[],
        },
        textResources: {
          resources: [{ id: 'ServiceName', value: 'Test' }],
        },
      },
      formDesigner: {
        layout: {
          activeList: [{
            firstInActiveList: true,
            id: '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88',
            inEditMode: false,
            lastInActiveList: true,
          }],
        },
      },
      serviceConfigurations: {
        APIs: {
          availableCodeLists: null as any,
          connections: null as any,
        },
      },
    };

    mockId = 'mockId';
    mockComponent = {
      dataModelBindings: {},
      itemType: 'COMPONENT',
      readOnly: false,
      required: false,
      textResourceBindings: {
        title: 'Input',
      },
      type: 'Input',
    };
    mockHandleActiveListChange = (obj: any) => {
      if (Object.keys(obj).length === 0 && obj.constructor === Object) {
        FormDesignerActionDispatchers.deleteActiveListAction();
      } else {
        FormDesignerActionDispatchers.updateActiveList(obj, []);
      }
    };
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
