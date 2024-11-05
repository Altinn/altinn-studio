import React from 'react';
import { screen } from '@testing-library/react';
import type { ISubformDataModelSelectProps } from './SubformDataModelSelect';
import { SubformDataModelSelect } from './SubformDataModelSelect';
import {
  jsonMetadata1Mock,
  jsonMetadata2Mock,
} from '../../../../../../../../schema-editor/test/mocks/metadataMocks';
import type { DataModelMetadataJson } from 'app-shared/types/DataModelMetadata';
import { convertMetadataToOption } from 'app-development/utils/metadataUtils';

import userEvent from '@testing-library/user-event';
import { renderWithProviders } from 'dashboard/testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

const user = userEvent.setup();

const metadata: DataModelMetadataJson[] = [jsonMetadata1Mock, jsonMetadata2Mock];
const jsonOption1 = convertMetadataToOption(jsonMetadata1Mock);
const jsonOption2 = convertMetadataToOption(jsonMetadata2Mock);
const setSelectedOption = jest.fn();
const defaultProps: ISubformDataModelSelectProps = {
  dataModels: metadata,
  disabled: false,
  selectedOption: jsonOption1,
  setSelectedOption,
};

describe('SubformDataModelSelect', () => {
  afterEach(jest.clearAllMocks);

  it('renders StudioNativeSelect with its label', () => {
    renderSubformDataModelSelect();
    expect(
      screen.getByRole('combobox', {
        name: textMock('ux_editor.component_properties.subform.data_model_binding_label'),
      }),
    ).toBeInTheDocument();
  });

  it('Renders all options', () => {
    renderSubformDataModelSelect();
    expect(screen.getAllByRole('option')).toHaveLength(metadata.length);
  });

  it('Selects provided selected item when there are provided options', async () => {
    renderSubformDataModelSelect({ selectedOption: jsonOption1 });
    expect(screen.getByRole('combobox')).toHaveValue(jsonOption1.value.repositoryRelativeUrl);
    expect(screen.getByRole('combobox')).toHaveDisplayValue(jsonOption1.label);
  });

  it('Calls setSelectedOption when selecting an option', async () => {
    renderSubformDataModelSelect();
    await user.selectOptions(
      screen.getByRole('combobox'),
      screen.getByRole('option', { name: jsonOption2.label }),
    );
    expect(setSelectedOption).toHaveBeenCalledTimes(1);
    expect(setSelectedOption).toHaveBeenCalledWith(jsonOption2);
  });
});

const renderSubformDataModelSelect = (props: Partial<ISubformDataModelSelectProps> = {}) =>
  renderWithProviders(<SubformDataModelSelect {...defaultProps} {...props} />);
