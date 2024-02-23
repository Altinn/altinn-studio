import React from 'react';
import { act, screen } from '@testing-library/react';

import { renderWithMockStore } from '../../../testing/mocks';
import { appDataMock, textResourcesMock } from '../../../testing/stateMocks';
import type { IAppDataState } from '../../../features/appData/appDataReducers';

import userEvent from '@testing-library/user-event';
import {
  EditGroupDataModelBindings,
  type EditGroupDataModelBindingProps,
} from '../../../../../ux-editor-v3/src/components/config/group/EditGroupDataModelBindings';

const mockAppData: IAppDataState = {
  ...appDataMock,
  textResources: {
    ...textResourcesMock,
  },
};

const render = (
  props?: Partial<EditGroupDataModelBindingProps>,
  appData?: Partial<IAppDataState>,
) => {
  const defaultProps: EditGroupDataModelBindingProps = {
    dataModelBindings: {},
    onDataModelChange: jest.fn(),
  };

  renderWithMockStore({ appData: { ...mockAppData, ...appData } })(
    <EditGroupDataModelBindings {...defaultProps} {...props} />,
  );
};

describe('EditDataModelBindings', () => {
  it.skip('should show select with no selected option by default', () => {
    render();
    expect(screen.getByText('ux_editor.modal_properties_data_model_helper')).toBeInTheDocument();
    expect(screen.getByRole('combobox').getAttribute('value')).toEqual('');
  });

  it.skip('should show select with provided data model binding', () => {
    render({
      dataModelBindings: {
        group: 'testModel.group',
      },
    });
    expect(screen.getByText('ux_editor.modal_properties_data_model_helper')).toBeInTheDocument();
    expect(screen.getByText('testModel.group')).toBeInTheDocument();
  });

  it.skip('should respond to selecting data model field', async () => {
    const user = userEvent.setup();
    const onDataModelChange = jest.fn();
    render({ onDataModelChange });

    const selectElement = screen.getByRole('combobox');
    await act(() => user.click(selectElement));
    const selectItem = screen.getByText('testModel.group');
    await act(() => user.click(selectItem));

    expect(onDataModelChange).toHaveBeenCalledWith('testModel.group', 'group');
  });
});
