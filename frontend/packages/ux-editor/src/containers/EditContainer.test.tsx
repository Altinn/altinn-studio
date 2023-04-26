import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { act, render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { IEditContainerProps } from './EditContainer';
import { EditContainer } from './EditContainer';
import { IAppState, IFormLayouts } from '../types/global';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { ServicesContextProvider } from '../../../../app-development/common/ServiceContext';
import { queriesMock } from '../testing/mocks';
import { ComponentType } from '../components';

// Test data:
const id = '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88'

describe('EditContainer', () => {
  test('should show edit id when edit button is clicked', async () => {
    const { user } = render();

    expect(
      screen.queryByText(textMock('ux_editor.modal_properties_component_change_id'))
    ).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue(id)).not.toBeInTheDocument();

    const editButton = screen.getByRole('button', { name: textMock('general.edit') });
    await act(() => user.click(editButton));

    expect(
      screen.getByText(textMock('ux_editor.modal_properties_component_change_id'))
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue(id)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: textMock('general.edit') })).not.toBeInTheDocument();
  });

  test('should have 3 accessible buttons, edit, cancel and save', async () => {
    const { user } = render();

    const editButton = screen.getByRole('button', { name: textMock('general.edit') });
    expect(editButton).toBeInTheDocument();

    await act(() => user.click(editButton));
    expect(screen.getByRole('button', { name: textMock('general.cancel') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: textMock('general.save') })).toBeInTheDocument();
  });
});

const render = (props: Partial<IEditContainerProps> = {}) => {
  const createStore = configureStore();
  const layouts: IFormLayouts = {
    default: {
      order: {
        'd70339c4-bb2d-4c09-b786-fed3622d042c': ['4a66b4ea-13f1-4187-864a-fd4bb6e8cf88']
      },
      components: {
        '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88': {
          id: '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88',
          dataModelBindings: {},
          readOnly: false,
          required: false,
          textResourceBindings: {
            title: 'Input'
          },
          type: ComponentType.Input,
          itemType: 'COMPONENT'
        }
      },
      containers: null,
      customRootProperties: {},
      customDataProperties: {},
    }
  }
  const initialState: IAppState = {
    appData: {
      textResources: {
        currentEditId: undefined,
      },
      ruleModel: null
    },
    formDesigner: {
      layout: {
        activeList: [
          {
            firstInActiveList: true,
            id: '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88',
            inEditMode: true,
            lastInActiveList: true
          }
        ],
        selectedLayout: 'default',
        activeContainer: null,
        error: null,
        invalidLayouts: [],
        saving: false,
        unSavedChanges: false
      }
    },
    serviceConfigurations: {
      manageServiceConfiguration: null,
      conditionalRendering: null,
      ruleConnection: null,
      APIs: {
        availableCodeLists: null as any,
        connections: null as any
      }
    },
    errors: null,
    widgets: null
  };

  const allProps: IEditContainerProps = {
    component: {
      id,
      dataModelBindings: {},
      readOnly: false,
      required: false,
      textResourceBindings: {
        title: 'Input'
      },
      type: ComponentType.Input,
      itemType: 'COMPONENT'
    },
    id,
    firstInActiveList: false,
    lastInActiveList: false,
    singleSelected: false,
    sendItemToParent: jest.fn(),
    dragHandleRef: null,
    children: null,
    ...props
  };

  const user = userEvent.setup();
  const mockStore = createStore(initialState);
  rtlRender(
    <ServicesContextProvider {...queriesMock} getFormLayouts={async () => layouts}>
      <Provider store={mockStore}>
        {/* eslint-disable-next-line testing-library/no-node-access */}
        <EditContainer {...allProps}>{allProps.children}</EditContainer>
      </Provider>
    </ServicesContextProvider>
  );

  return { user };
};
