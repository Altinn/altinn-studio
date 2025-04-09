import React from 'react';
import { renderWithProviders } from '../../../testing/mocks';
import { CreateSubformMode, type CreateSubformModeProps } from './CreateSubformMode';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const existingDataModels = ['dataModel1', 'dataModel2'];

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
    const user = userEvent.setup();
    renderCreateSubformMode();
    const invalidSubformName = 'invalid name';

    const subformNameInput = screen.getByLabelText(subformNameLabel);
    await user.type(subformNameInput, invalidSubformName);
    expect(subformNameInput).toHaveValue(invalidSubformName);

    const errorMessage = screen.getByText(textMock('validation_errors.name_invalid'));
    expect(errorMessage).toBeInTheDocument();
  });

  it('should display error if data model name is invalid', async () => {
    const user = userEvent.setup();
    renderCreateSubformMode();
    const invalidDataModelName = 'invalid name';

    const createNewDataModelTab = screen.getByText(textMock('general.create_new'));
    await user.click(createNewDataModelTab);

    const dataModelNameInput = screen.getByLabelText(
      textMock('ux_editor.task_card.new_data_model'),
    );
    await user.type(dataModelNameInput, invalidDataModelName);
    expect(dataModelNameInput).toHaveValue(invalidDataModelName);

    const errorMessage = screen.getByText(textMock('schema_editor.error_invalid_datamodel_name'));
    expect(errorMessage).toBeInTheDocument();
  });

  it('should create new subform when save button is clicked', async () => {
    const user = userEvent.setup();
    const setIsCreateSubformMode = jest.fn();
    const newSubformName = 'subformName';
    renderCreateSubformMode({
      setIsCreateSubformMode,
    });

    const subformNameInput = screen.getByLabelText(subformNameLabel);
    await user.type(subformNameInput, newSubformName);

    const createNewDataModelTab = screen.getByText(textMock('general.create_new'));
    await user.click(createNewDataModelTab);

    const dataModelNameInput = screen.getByLabelText(
      textMock('ux_editor.task_card.new_data_model'),
    );

    await user.type(dataModelNameInput, newSubformName);
    const saveButton = screen.getByText(textMock('general.save'));
    await user.click(saveButton);

    expect(setIsCreateSubformMode).toHaveBeenCalledWith(false);
  });
});

const subformNameLabel = textMock('ux_editor.task_card.new_subform');

const renderCreateSubformMode = (props?: CreateSubformModeProps) => {
  return renderWithProviders(<CreateSubformMode {...props} />);
};
