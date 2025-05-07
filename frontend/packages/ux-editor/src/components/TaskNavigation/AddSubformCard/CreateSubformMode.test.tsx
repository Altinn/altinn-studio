import React from 'react';
import { renderWithProviders } from '../../../testing/mocks';
import { CreateSubformMode, type CreateSubformModeProps } from './CreateSubformMode';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { app, org } from '@studio/testing/testids';
import { QueryKey } from 'app-shared/types/QueryKey';

const dataModelIds = ['dataModel1', 'dataModel2'];
const subformName = 'subformName';
const invalidName = 'invalid name';

describe('CreateSubformMode', () => {
  it('should render CreateSubformMode', () => {
    renderCreateSubformMode();

    const subformTitle = screen.getByText(textMock('ux_editor.subform'));
    expect(subformTitle).toBeInTheDocument();
  });

  it('should set isSubformInEditMode to false when cancel button is clicked', async () => {
    const setIsCreateSubformMode = jest.fn();
    const user = userEvent.setup();
    renderCreateSubformMode({ setIsCreateSubformMode });

    const cancelButton = screen.getByText(textMock('general.cancel'));
    await user.click(cancelButton);
    expect(setIsCreateSubformMode).toHaveBeenCalledWith(false);
  });

  it('should display error if subform name is invalid', async () => {
    renderCreateSubformMode();

    await writeSubformName(invalidName);
    const errorMessage = screen.getByText(textMock('validation_errors.name_invalid'));
    expect(errorMessage).toBeInTheDocument();
  });

  it('should display error if data model name is invalid', async () => {
    const user = userEvent.setup();
    renderCreateSubformMode();

    const createNewDataModelTab = screen.getByText(textMock('general.create_new'));
    await user.click(createNewDataModelTab);

    const dataModelNameInput = screen.getByLabelText(
      textMock('ux_editor.task_card.new_data_model'),
    );
    await user.type(dataModelNameInput, invalidName);
    expect(dataModelNameInput).toHaveValue(invalidName);

    const errorMessage = screen.getByText(textMock('schema_editor.error_invalid_datamodel_name'));
    expect(errorMessage).toBeInTheDocument();
  });

  it('should be possible to create a new subform with a new datamodel', async () => {
    const user = userEvent.setup();
    const setIsCreateSubformMode = jest.fn();

    renderCreateSubformMode({
      setIsCreateSubformMode,
    });

    await writeSubformName(subformName);

    const createNewDataModelTab = screen.getByText(textMock('general.create_new'));
    await user.click(createNewDataModelTab);

    const dataModelNameInput = screen.getByLabelText(
      textMock('ux_editor.task_card.new_data_model'),
    );
    await user.type(dataModelNameInput, subformName);

    await clickOnSaveButton();
    expect(setIsCreateSubformMode).toHaveBeenCalledWith(false);
  });

  it('should be possible to create a new subform with existing data model', async () => {
    const user = userEvent.setup();
    const setIsCreateSubformMode = jest.fn();
    renderCreateSubformMode({
      setIsCreateSubformMode,
    });

    await writeSubformName(subformName);

    const chooseDataModelTab = screen.getByText(textMock('general.select'));
    await user.click(chooseDataModelTab);

    const dataModelSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.task_card.select_data_model'),
    });
    await user.selectOptions(dataModelSelect, [dataModelIds[0]]);

    await clickOnSaveButton();
    expect(setIsCreateSubformMode).toHaveBeenCalledWith(false);
  });
});

const subformNameLabel = textMock('ux_editor.task_card.subform_name_label');
const writeSubformName = async (inputName: string) => {
  const subformNameInput = screen.getByLabelText(subformNameLabel);
  await userEvent.type(subformNameInput, inputName);
  expect(subformNameInput).toHaveValue(inputName);
};
const clickOnSaveButton = async () => {
  const saveButton = screen.getByText(textMock('general.save'));
  await userEvent.click(saveButton);
};

const renderCreateSubformMode = (props?: CreateSubformModeProps) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.AppMetadataModelIds, org, app, false], dataModelIds);

  return renderWithProviders(<CreateSubformMode {...props} />, {
    queryClient,
  });
};
