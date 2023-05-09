import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { IEditFormComponentProps } from './EditFormComponent';
import { EditFormComponent } from './EditFormComponent';
import { IAppState, IFormLayouts } from '../types/global';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { ServicesContextProps } from '../../../../app-development/common/ServiceContext';
import { renderWithMockStore } from '../testing/mocks';
import { ComponentType } from '../components';

const user = userEvent.setup();

// Test data:
const id = '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88'

describe('EditFormComponent', () => {
  test('should show edit id when edit button is clicked', async () => {
    await render();

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
    await render();

    const editButton = screen.getByRole('button', { name: textMock('general.edit') });
    expect(editButton).toBeInTheDocument();

    await act(() => user.click(editButton));
    expect(screen.getByRole('button', { name: textMock('general.cancel') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: textMock('general.save') })).toBeInTheDocument();
  });
});

const render = async (props: Partial<IEditFormComponentProps> = {}) => {
  const layouts: IFormLayouts = {
    default: {
      order: {
        'd70339c4-bb2d-4c09-b786-fed3622d042c': [id]
      },
      components: {
        [id]: {
          id,
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
      }
    },
    formDesigner: {
      layout: {
        selectedLayout: 'default',
        error: null,
        invalidLayouts: [],
        saving: false,
        unSavedChanges: false
      }
    },
    errors: null,
    widgets: null
  };

  const allProps: IEditFormComponentProps = {
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
    dragHandleRef: null,
    children: null,
    ...props
  };

  const queries: Partial<ServicesContextProps> = { getFormLayouts: async () => layouts };

  return renderWithMockStore(initialState, queries)(
    <EditFormComponent {...allProps}>{allProps.children}</EditFormComponent> // eslint-disable-line testing-library/no-node-access
  );
};
