import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../testing/mocks';
import { EditComponentIdRow, type EditComponentIdRowProps } from './EditComponentIdRow';
import userEvent from '@testing-library/user-event';
import { ComponentType } from 'app-shared/types/ComponentType';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import type { IFormLayouts } from '../../../../types/global';
import { QueryKey } from 'app-shared/types/QueryKey';
import { layout1NameMock, layoutMock } from '@altinn/ux-editor/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { app, org } from '@studio/testing/testids';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';

const layoutSetName = layoutSet1NameMock;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};

describe('EditComponentIdRow', () => {
  beforeEach(jest.clearAllMocks);

  it('should render button ', async () => {
    await renderEditComponentIdRow();
    const testIdButton = screen.getByRole('button', { name: componentId });
    expect(testIdButton).toBeInTheDocument();
  });

  it('should render textField when the button is clicked', async () => {
    const user = userEvent.setup();
    await renderEditComponentIdRow();
    const testIdButton = screen.getByRole('button', { name: componentId });
    await user.click(testIdButton);
    const textField = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_component_change_id'),
    });
    expect(textField).toBeInTheDocument();
  });

  it('should not render the textfield when changing from edit mode to view mode ', async () => {
    const user = userEvent.setup();
    await renderEditComponentIdRow();
    const testIdButton = screen.getByRole('button', { name: componentId });
    await user.click(testIdButton);
    const textField = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_component_change_id'),
    });
    await user.click(document.body);
    expect(textField).not.toBeInTheDocument();
  });

  it('should call onChange when user change the input in text filed.', async () => {
    const user = userEvent.setup();
    await renderEditComponentIdRow();
    const testIdButton = screen.getByRole('button', { name: componentId });
    await user.click(testIdButton);
    const textField = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_component_change_id'),
    });
    const newTestId = 'newTestId';
    await user.clear(textField);
    await user.type(textField, newTestId);
    await user.click(document.body);
    expect(handleComponentUpdate).toHaveBeenCalledTimes(1);
    expect(handleComponentUpdate).toHaveBeenCalledWith({
      ...componentMocks[ComponentType.Input],
      id: newTestId,
    });
  });

  it('should show error required error message when id is empty', async () => {
    const user = userEvent.setup();
    await renderEditComponentIdRow();
    const testIdButton = screen.getByRole('button', { name: componentId });
    await user.click(testIdButton);
    const textField = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_component_change_id'),
    });
    await user.clear(textField);
    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });

  it('should show error message when id is not unique', async () => {
    const user = userEvent.setup();
    await renderEditComponentIdRow();
    const testIdButton = screen.getByRole('button', { name: componentId });
    await user.click(testIdButton);
    const textField = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_component_change_id'),
    });
    await user.clear(textField);
    await user.type(textField, 'FileUpload');
    expect(
      screen.getByText(textMock('ux_editor.modal_properties_component_id_not_unique_error')),
    ).toBeInTheDocument();
  });

  it('should show error message when id of an attachment component type has duplicate id', async () => {
    const user = userEvent.setup();
    const idOccupiedByDataType = 'idOccupiedByDataType';
    queryClientMock.setQueryData([QueryKey.AppMetadata, org, app], {
      dataTypes: [{ id: idOccupiedByDataType }],
    });
    await renderEditComponentIdRow({
      component: componentMocks[ComponentType.FileUpload],
    });
    const testIdButton = screen.getByRole('button', {
      name: componentMocks[ComponentType.FileUpload].id,
    });
    await user.click(testIdButton);
    const textField = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_component_change_id'),
    });
    await user.clear(textField);
    await user.type(textField, idOccupiedByDataType);
    await user.click(document.body);
    expect(
      screen.getByText(textMock('ux_editor.error_component_id_exists_as_data_type')),
    ).toBeInTheDocument();
  });
});

const componentId = componentMocks[ComponentType.Input].id;
const handleComponentUpdate = jest.fn();
const helpText = 'helpText';
const defaultProps: EditComponentIdRowProps = {
  component: componentMocks[ComponentType.Input],
  handleComponentUpdate,
  helpText,
};

const renderEditComponentIdRow = async (props: Partial<EditComponentIdRowProps> = {}) => {
  queryClientMock.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], layouts);
  return renderWithProviders(<EditComponentIdRow {...defaultProps} {...props} />);
};
