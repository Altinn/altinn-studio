import React from 'react';
import { screen } from '@testing-library/react';

import {
  appDataMock,
  dataModelItemMock,
  dataModelStateMock,
  renderWithMockStore,
  textResourcesMock,
} from '../../../testing/mocks';
import { IAppDataState } from '../../../features/appData/appDataReducers';
import {
  EditGroupDataModelBindings,
  EditGroupDataModelBindingProps,
} from './EditGroupDataModelBindings';
import { IDataModelFieldElement } from '../../../types/global';
import userEvent from '@testing-library/user-event';

const dataModelMock: IDataModelFieldElement[] = [
  {
    ...dataModelItemMock,
    dataBindingName: 'testModel.group',
    maxOccurs: 10,
  },
  {
    ...dataModelItemMock,
    dataBindingName: 'testModel.group2',
    maxOccurs: 10,
  },
  {
    ...dataModelItemMock,
    dataBindingName: 'testModel.field2',
  },
];

const mockAppData: IAppDataState = {
  ...appDataMock,
  textResources: {
    ...textResourcesMock,
  },
  dataModel: {
    ...dataModelStateMock,
    model: dataModelMock,
  },
};

const render = (
  props?: Partial<EditGroupDataModelBindingProps>,
  appData?: Partial<IAppDataState>
) => {
  const defaultProps: EditGroupDataModelBindingProps = {
    dataModelBindings: {},
    onDataModelChange: jest.fn(),
  };
  const user = userEvent.setup();

  renderWithMockStore({ appData: { ...mockAppData, ...appData } })(
    <EditGroupDataModelBindings {...defaultProps} {...props} />
  );

  return { user };
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
    const onDataModelChange = jest.fn();
    const { user } = render({ onDataModelChange });

    const selectElement = screen.getByRole('combobox');
    await user.click(selectElement);
    const selectItem = screen.getByText('testModel.group');
    await user.click(selectItem);

    expect(onDataModelChange).toHaveBeenCalledWith('testModel.group', 'group');
  });
});
