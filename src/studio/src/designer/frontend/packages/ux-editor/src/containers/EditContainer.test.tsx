import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditContainer } from './EditContainer';
import type { IEditContainerProvidedProps } from './EditContainer';

const user = userEvent.setup();
const id = '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88';

describe('EditContainer', () => {
  it('should show edit id when edit button is clicked', async () => {
    render();

    expect(
      screen.queryByText(/ux_editor\.modal_properties_component_change_id/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue(id)).not.toBeInTheDocument();

    const editButton = screen.getByTestId('EditContainer-edit-button');
    await user.click(editButton);

    expect(
      screen.getByText(/ux_editor\.modal_properties_component_change_id/i)
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue(id)).toBeInTheDocument();
    expect(screen.queryByTestId('EditContainer-edit-button')).not.toBeInTheDocument();
  });
});

const render = (props: Partial<IEditContainerProvidedProps> = {}) => {
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
        resources: [{ id: 'appName', value: 'Test' }],
      },
      codeLists: {
        codeLists: [] as any[],
      },
    },
    formDesigner: {
      layout: {
        activeList: [
          {
            firstInActiveList: true,
            id: '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88',
            inEditMode: true,
            lastInActiveList: true,
          },
        ],
        layouts: {
          default: {
            order: {
              'd70339c4-bb2d-4c09-b786-fed3622d042c': ['4a66b4ea-13f1-4187-864a-fd4bb6e8cf88'],
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

  const allProps: IEditContainerProvidedProps = {
    component: {
      id,
      dataModelBindings: {},
      readOnly: false,
      required: false,
      textResourceBindings: {
        title: 'Input',
      },
      type: 'Input',
    },
    id,
    firstInActiveList: false,
    lastInActiveList: false,
    singleSelected: false,
    sendItemToParent: jest.fn(),
    dragHandleRef: null,
    children: null,
    ...props,
  };

  const mockStore = createStore(initialState);

  rtlRender(
    <Provider store={mockStore}>
      <EditContainer {...allProps}>
        {allProps.children}
      </EditContainer>
    </Provider>
  );
};
