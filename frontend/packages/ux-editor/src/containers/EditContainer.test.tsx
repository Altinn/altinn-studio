import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { act, render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditContainer } from './EditContainer';
import type { IEditContainerProps } from './EditContainer';
import { IAppState } from '../types/global';
import { mockUseTranslation } from '../../../../testing/mocks/i18nMock';

// Test data:
const id = '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88'
const texts = {
  'ux_editor.modal_properties_data_model_helper': 'Lenke til datamodell',
  'general.for': 'for',
  'general.edit': 'Endre',
  'general.delete': 'Slett',
  'general.save': 'Lagre',
  'general.cancel': 'Avbryt',
};

// Mocks:
jest.mock(
  'react-i18next',
  () => ({ useTranslation: () => mockUseTranslation(texts) }),
);

describe('EditContainer', () => {
  test('should show edit id when edit button is clicked', async () => {
    const { user } = render();

    expect(
      screen.queryByText(/ux_editor\.modal_properties_component_change_id/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue(id)).not.toBeInTheDocument();

    const editButton = screen.getByRole('button', { name: 'Endre' });
    await act(() => user.click(editButton));

    expect(
      screen.getByText(/ux_editor\.modal_properties_component_change_id/i)
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue(id)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Endre' })).not.toBeInTheDocument();
  });

  test('should have 3 accessible buttons, edit, cancel and save', async () => {
    const { user } = render();

    const editButton = screen.getByRole('button', { name: 'Endre' });
    expect(editButton).toBeInTheDocument();

    await act(() => user.click(editButton));
    expect(screen.getByRole('button', { name: 'Avbryt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lagre' })).toBeInTheDocument();
  });
});

const render = (props: Partial<IEditContainerProps> = {}) => {
  const createStore = configureStore();
  const initialState: IAppState = {
    appData: {
      dataModel: {
        model: [] as any[],
        error: null,
        fetched: true,
        fetching: false
      },
      textResources: {
        resources: {
          nb: [{ id: 'appName', value: 'Test' }]
        },
        error: null,
        fetched: true,
        currentEditId: undefined,
        fetching: false,
        language: 'nb',
        saving: false,
        languages: ['nb'],
        saved: true
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
        layouts: {
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
                type: 'Input'
              }
            },
            containers: null
          }
        },
        selectedLayout: 'default',
        activeContainer: null,
        error: null,
        fetched: true,
        fetching: false,
        invalidLayouts: [],
        isLayoutSettingsFetched: false,
        layoutSettings: null,
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
      type: 'Input'
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
    <Provider store={mockStore}>
      {/* eslint-disable-next-line testing-library/no-node-access */}
      <EditContainer {...allProps}>{allProps.children}</EditContainer>
    </Provider>
  );

  return { user };
};
