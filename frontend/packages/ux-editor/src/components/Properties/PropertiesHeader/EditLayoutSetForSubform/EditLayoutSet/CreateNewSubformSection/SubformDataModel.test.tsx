import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { SubformDataModel, type SubformDataModelProps } from './SubformDataModel';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from 'dashboard/testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';

jest.mock('app-shared/hooks/queries/useAppMetadataModelIdsQuery');

const user = userEvent.setup();

const mockDataModelIds = ['dataModelId1', 'dataModelId2'];

(useAppMetadataModelIdsQuery as jest.Mock).mockReturnValue({ data: mockDataModelIds });

describe('SubformDataModelSelect', () => {
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

  it('Renders a hidden placeholder option with an empty value', () => {
    renderSubformDataModelSelect();
    const placeholderOption = screen.getByRole('option', { hidden: true, name: '' });
    expect(placeholderOption).toBeInTheDocument();
    expect(placeholderOption).toHaveAttribute('value', '');
  });

  it('Calls handleDataModel when selecting an option', async () => {
    const handleDataModel = jest.fn();
    renderSubformDataModelSelect({ handleDataModel });

    await user.selectOptions(
      screen.getByRole('combobox'),
      screen.getByRole('option', { name: mockDataModelIds[1] }),
    );
    await waitFor(() => expect(handleDataModel).toHaveBeenCalledTimes(1));
    expect(handleDataModel).toHaveBeenCalledWith(mockDataModelIds[1]);
  });

  it('Should call setDisplayDataModelInput true when clicking create new data model button', async () => {
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
  handleDataModel: jest.fn(),
  setDisplayDataModelInput: jest.fn(),
  setDataModel: jest.fn(),
  displayDataModelInput: false,
};

const renderSubformDataModelSelect = (props: Partial<SubformDataModelProps> = {}) => {
  (useAppMetadataModelIdsQuery as jest.Mock).mockReturnValue({ data: mockDataModelIds });
  renderWithProviders(<SubformDataModel {...defaultProps} {...props} />);
};
