/* tslint:disable:jsx-wrap-multiline */
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';
import FormDesignerActionDispatchers from '../../../actions/formDesignerActions/formDesignerActionDispatcher';
import { Edit, EditContainer } from '../../../containers/EditContainer';

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
          order: {
            'd70339c4-bb2d-4c09-b786-fed3622d042c': [
              '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88',
            ],
          },
          components: {
            '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88': {
              id: '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88',
              componentType: 2,
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
      componentType: 2,
      dataModelBindings: {},
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
  it('+++ should run handleSetActive when clicked', () => {
    const mountedEditContainer = mount(
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
    const instance = mountedEditContainer.find('Edit').instance() as Edit;
    const spy = jest.spyOn(instance, 'handleSetActive');
    const listItem = mountedEditContainer.find('Edit').find('li').first();

    listItem.simulate('click');
    listItem.simulate('click');
    instance.forceUpdate();
    expect(spy).toHaveBeenCalled();
  });
  it('+++ should show elements when isEditMode and run handleSave when CheckBtn is clicked', () => {
    const mountedEditContainer = mount(
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
    const instance = mountedEditContainer.find('Edit').instance() as Edit;
    instance.setState({isEditMode: true});
    instance.forceUpdate();
    mountedEditContainer.update();
    /* Check if html has updated */
    expect(instance.state.isEditMode).toEqual(true);
    expect(mountedEditContainer.find('Edit').find('i').last().hasClass('fa-circlecheck')).toEqual(true);

    /* Click on checkBtn */
    instance.setState({component: {
      id: '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88',
      componentType: 2,
      dataModelBindings: {},
      readOnly: false,
      required: true,
      textResourceBindings: {
        title: 'Input',
      },
      type: 'Input',
    }});
    instance.forceUpdate();
    mountedEditContainer.update();
    const checkBtn = mountedEditContainer.find('Edit').find('button').last();
    checkBtn.simulate('click');
    instance.forceUpdate();
    expect(instance.state.isEditMode).toEqual(false);
  });
  it('+++ should run handleSaveChange', () => {
    const mountedEditContainer = mount(
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
    const instance = mountedEditContainer.find('Edit').instance() as Edit;
    const spy = jest.spyOn(instance, 'handleSaveChange');
    instance.setState({
      isEditMode: true,
      component: {
        id: '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88',
        componentType: 2,
        dataModelBindings: {
          simpleBinding: 'skattyterinforgrp5801.infogrp5802.oppgavegiverNavnPreutfyltdatadef25795.value',
        },
        readOnly: false,
        required: true,
        textResourceBindings: {
          title: 'Input',
        },
        type: 'Input',
      }
    });
    instance.forceUpdate();
    mountedEditContainer.update();

    const checkBtn = mountedEditContainer.find('Edit').find('button').last();
    checkBtn.simulate('click');
    instance.forceUpdate();
    expect(instance.state.isEditMode).toEqual(false);
    expect(spy).toHaveBeenCalled();
  });
});
