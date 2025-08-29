import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { SubformDataModel, type SubformDataModelProps } from './SubformDataModel';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from 'dashboard/testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';

jest.mock('app-shared/hooks/queries/useAppMetadataModelIdsQuery');

const mockDataModelIds = ['dataModelId1', 'dataModelId2'];

(useAppMetadataModelIdsQuery as jest.Mock).mockReturnValue({ data: mockDataModelIds });

describe('SubformDataModel', () => {
  afterEach(jest.clearAllMocks);

  it('renders StudioNativeSelect with its label and options', () => {
    renderSubformDataModelSelect();

    const dataModelSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.component_properties.subform.data_model_binding_label'),
    });
    const options = screen.getAllByRole('option');

    expect(dataModelSelect).toBeInTheDocument();
    expect(options).toHaveLength(mockDataModelIds.length);
  });

  it('Renders placeholder option with an empty value', () => {
    renderSubformDataModelSelect();

    const placeholderOption = screen.getByRole('option', {
      hidden: true,
      name: '',
    });
    expect(placeholderOption).toBeInTheDocument();
    expect(placeholderOption).toHaveAttribute('value', '');
  });

  it('Calls setDataModel when selecting an option', async () => {
    const user = userEvent.setup();
    const setSelectedDataModel = jest.fn();
    renderSubformDataModelSelect({ setSelectedDataModel });

    await user.selectOptions(
      screen.getByRole('combobox'),
      screen.getByRole('option', { name: mockDataModelIds[1] }),
    );
    await waitFor(() => expect(setSelectedDataModel).toHaveBeenCalledTimes(1));
    expect(setSelectedDataModel).toHaveBeenCalledWith(mockDataModelIds[1]);
  });

  it('Should call setDisplayDataModelInput true when clicking create new data model button', async () => {
    const user = userEvent.setup();
    const setDisplayDataModelInput = jest.fn();
    renderSubformDataModelSelect({ setDisplayDataModelInput });
    const displayDataModelInput = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.subform.create_new_data_model'),
    });
    await user.click(displayDataModelInput);

    expect(setDisplayDataModelInput).toHaveBeenCalledWith(true);
  });

  it('Should display create new data model input when setDisplayDataModelInput is true', () => {
    renderSubformDataModelSelect({ displayDataModelInput: true });
    const dataModelInput = screen.getByRole('textbox', {
      name: textMock('ux_editor.component_properties.subform.create_new_data_model_label'),
    });

    expect(dataModelInput).toBeInTheDocument();
  });
});

const defaultProps: SubformDataModelProps = {
  setDisplayDataModelInput: jest.fn(),
  displayDataModelInput: false,
  setSelectedDataModel: jest.fn(),
  dataModelIds: mockDataModelIds,
  validateName: jest.fn(),
  dataModelNameError: '',
  setIsTextfieldEmpty: jest.fn(),
};

const renderSubformDataModelSelect = (props: Partial<SubformDataModelProps> = {}) => {
  (useAppMetadataModelIdsQuery as jest.Mock).mockReturnValue({ data: mockDataModelIds });
  renderWithProviders(<SubformDataModel {...defaultProps} {...props} />);
};
