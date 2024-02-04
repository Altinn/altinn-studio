import React from 'react';
import { render as renderRtl, screen } from '@testing-library/react';
import type { ISchemaSelectProps } from './SchemaSelect';
import { SchemaSelect } from './SchemaSelect';
import {
  jsonMetadata1Mock,
  jsonMetadata2Mock,
} from '../../../../../packages/schema-editor/test/mocks/metadataMocks';
import type { DatamodelMetadata } from 'app-shared/types/DatamodelMetadata';
import { convertMetadataToOption } from '../../../../utils/metadataUtils';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

// Test data:
const metadata: DatamodelMetadata[] = [jsonMetadata1Mock, jsonMetadata2Mock];
const jsonOption1 = convertMetadataToOption(jsonMetadata1Mock);
const jsonOption2 = convertMetadataToOption(jsonMetadata2Mock);
const setSelectedOption = jest.fn();
const defaultProps: ISchemaSelectProps = {
  datamodels: metadata,
  disabled: false,
  selectedOption: jsonOption1,
  setSelectedOption,
};

describe('SchemaSelect', () => {
  afterEach(jest.clearAllMocks);

  it('Renders empty select when there are no provided options', () => {
    render({ datamodels: [] });
    expect(screen.getByRole('combobox')).toBeEmptyDOMElement();
  });

  it('Renders all options', () => {
    render();
    expect(screen.getAllByRole('option')).toHaveLength(metadata.length);
  });

  it('Selects provided selected item when there are provided options', async () => {
    render({ selectedOption: jsonOption1 });
    expect(screen.getByRole('combobox')).toHaveValue(jsonOption1.value.repositoryRelativeUrl);
    expect(screen.getByRole('combobox')).toHaveDisplayValue(jsonOption1.label);
  });

  it('Calls setSelectedOption when selecting an option', async () => {
    render();
    await user.selectOptions(
      screen.getByRole('combobox'),
      screen.getByRole('option', { name: jsonOption2.label }),
    );
    expect(setSelectedOption).toHaveBeenCalledTimes(1);
    expect(setSelectedOption).toHaveBeenCalledWith(jsonOption2);
  });
});

const render = (props: Partial<ISchemaSelectProps> = {}) =>
  renderRtl(<SchemaSelect {...defaultProps} {...props} />);
