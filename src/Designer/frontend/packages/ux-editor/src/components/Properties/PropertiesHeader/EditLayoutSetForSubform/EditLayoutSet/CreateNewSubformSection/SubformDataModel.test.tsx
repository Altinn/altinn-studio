import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { SubformDataModel, type SubformDataModelProps } from './SubformDataModel';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from 'dashboard/testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';

vi.mock('app-shared/hooks/queries/useAppMetadataModelIdsQuery');

const mockDataModelIds = ['dataModelId1', 'dataModelId2'];

(useAppMetadataModelIdsQuery as Mock).mockReturnValue({ data: mockDataModelIds });

describe('SubformDataModel', () => {
  afterEach(vi.clearAllMocks);

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
    const setSelectedDataModel = vi.fn();
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
    const setDisplayDataModelInput = vi.fn();
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
  setDisplayDataModelInput: vi.fn(),
  displayDataModelInput: false,
  setSelectedDataModel: vi.fn(),
  dataModelIds: mockDataModelIds,
  validateName: vi.fn(),
  dataModelNameError: '',
  setIsTextfieldEmpty: vi.fn(),
};

const renderSubformDataModelSelect = (props: Partial<SubformDataModelProps> = {}) => {
  (useAppMetadataModelIdsQuery as Mock).mockReturnValue({ data: mockDataModelIds });
  renderWithProviders(<SubformDataModel {...defaultProps} {...props} />);
};
