import React from 'react';
import { screen } from '@testing-library/react';
import type { ISubformDataModelSelectProps } from './SubformDataModelSelect';
import { SubformDataModelSelect } from './SubformDataModelSelect';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from 'dashboard/testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';

jest.mock('app-shared/hooks/queries/useAppMetadataModelIdsQuery');

const user = userEvent.setup();

const mockDataModelIds = ['dataModelId1', 'dataModelId2'];
const defaultProps: ISubformDataModelSelectProps = {
  selectedDataType: '',
  setSelectedDataType: jest.fn(),
};

describe('SubformDataModelSelect', () => {
  afterEach(jest.clearAllMocks);

  it('renders StudioNativeSelect with its label', () => {
    (useAppMetadataModelIdsQuery as jest.Mock).mockReturnValue({ data: mockDataModelIds });
    renderSubformDataModelSelect();
    expect(
      screen.getByRole('combobox', {
        name: textMock('ux_editor.component_properties.subform.data_model_binding_label'),
      }),
    ).toBeInTheDocument();
  });

  it('Renders all options', () => {
    (useAppMetadataModelIdsQuery as jest.Mock).mockReturnValue({ data: mockDataModelIds });
    renderSubformDataModelSelect();
    expect(screen.getAllByRole('option')).toHaveLength(mockDataModelIds.length);
  });

  it('Selects provided selected item when there are provided options', () => {
    (useAppMetadataModelIdsQuery as jest.Mock).mockReturnValue({ data: mockDataModelIds });
    renderSubformDataModelSelect({ selectedDataType: mockDataModelIds[1] });
    expect(screen.getByRole('combobox')).toHaveValue(mockDataModelIds[1]);
  });

  it('Renders a hidden placeholder option with an empty value', () => {
    (useAppMetadataModelIdsQuery as jest.Mock).mockReturnValue({ data: mockDataModelIds });
    renderSubformDataModelSelect();
    const placeholderOption = screen.getByRole('option', { hidden: true, name: '' });
    expect(placeholderOption).toBeInTheDocument();
    expect(placeholderOption).toHaveAttribute('value', '');
  });

  it('Calls setSelectedDataType when selecting an option', async () => {
    (useAppMetadataModelIdsQuery as jest.Mock).mockReturnValue({ data: mockDataModelIds });
    const setSelectedDataType = jest.fn();
    renderSubformDataModelSelect({ setSelectedDataType });
    await user.selectOptions(
      screen.getByRole('combobox'),
      screen.getByRole('option', { name: mockDataModelIds[1] }),
    );
    expect(setSelectedDataType).toHaveBeenCalledTimes(1);
    expect(setSelectedDataType).toHaveBeenCalledWith(mockDataModelIds[1]);
  });
});

const renderSubformDataModelSelect = (props: Partial<ISubformDataModelSelectProps> = {}) =>
  renderWithProviders(<SubformDataModelSelect {...defaultProps} {...props} />);
