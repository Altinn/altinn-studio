import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../testing/mocks';
import { EditComponentIdRow, type EditComponentIdRowProps } from './EditComponentIdRow';
import userEvent from '@testing-library/user-event';
import { ComponentType } from 'app-shared/types/ComponentType';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import type { IFormLayouts } from '../../../../types/global';
import { QueryKey } from 'app-shared/types/QueryKey';
import { layout1NameMock, layoutMock, layoutSetsMock } from '../../../../testing/layoutMock';
import { app, org } from '@studio/testing/testids';

const layoutSetName = layoutSetsMock.sets[0].id;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};

const studioRender = async (props: Partial<EditComponentIdRowProps> = {}) => {
  queryClientMock.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], layouts);
  return renderWithProviders(
    <EditComponentIdRow
      component={{
        id: 'test',
        type: ComponentType.Input,
        ...props.component,
      }}
      handleComponentUpdate={jest.fn()}
      helpText={'test'}
      {...props}
    />,
  );
};

describe('EditComponentIdRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render button ', async () => {
    await studioRender();
    const testIdButton = screen.getByRole('button', { name: textMock('ux_editor.id_identifier') });
    expect(testIdButton).toBeInTheDocument();
  });

  it('should render textField when the button is clicked', async () => {
    const user = userEvent.setup();
    await studioRender();
    const testIdButton = screen.getByRole('button', { name: textMock('ux_editor.id_identifier') });
    await user.click(testIdButton);
    const textField = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_component_change_id'),
    });
    expect(textField).toBeInTheDocument();
  });

  it('should not render the textfield when changing from edit mode to view mode ', async () => {
    const user = userEvent.setup();
    await studioRender();
    const testIdButton = screen.getByRole('button', { name: textMock('ux_editor.id_identifier') });
    await user.click(testIdButton);
    const textField = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_component_change_id'),
    });
    await user.click(document.body);
    expect(textField).not.toBeInTheDocument();
  });

  it('should call onChange when user change the input in text filed.', async () => {
    const user = userEvent.setup();
    const handleComponentUpdate = jest.fn();
    await studioRender({ handleComponentUpdate });
    const testIdButton = screen.getByRole('button', { name: textMock('ux_editor.id_identifier') });
    await user.click(testIdButton);
    const textField = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_component_change_id'),
    });
    await user.type(textField, 'newTestId');
    await user.click(document.body);
    expect(handleComponentUpdate).toHaveBeenCalled();
  });

  it('should show error required error message when id is empty', async () => {
    const user = userEvent.setup();
    await studioRender();
    const testIdButton = screen.getByRole('button', { name: textMock('ux_editor.id_identifier') });
    await user.click(testIdButton);
    const textField = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_component_change_id'),
    });
    await user.clear(textField);
    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });

  it('should show error message when id is not unique', async () => {
    const user = userEvent.setup();
    await studioRender();
    const testIdButton = screen.getByRole('button', { name: textMock('ux_editor.id_identifier') });
    await user.click(testIdButton);
    const textField = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_component_change_id'),
    });
    await user.clear(textField);
    await user.type(textField, 'fileUploadComponentIdMock');
    expect(
      screen.getByText(textMock('ux_editor.modal_properties_component_id_not_unique_error')),
    ).toBeInTheDocument();
  });
});
