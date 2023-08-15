import React from 'react';
import { screen } from '@testing-library/react';
import type { ISchemaSelectProps } from './SchemaSelect';
import { SchemaSelect } from './SchemaSelect';
import { renderWithProviders, RenderWithProvidersData } from '../../../../../packages/schema-editor/test/renderWithProviders';
import { jsonMetadata1Mock, jsonMetadata2Mock } from '../../../../../packages/schema-editor/test/mocks/metadataMocks';
import { DatamodelMetadata } from 'app-shared/types/DatamodelMetadata';
import { convertMetadataToOption } from '../../../../utils/metadataUtils';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

// Test data:
const org = 'org';
const app = 'app';
const metadata: DatamodelMetadata[] = [jsonMetadata1Mock, jsonMetadata2Mock];
const jsonOption1 = convertMetadataToOption(jsonMetadata1Mock);
const jsonOption2 = convertMetadataToOption(jsonMetadata2Mock);
const setSelectedOption = jest.fn();
const defaultProps: ISchemaSelectProps = {
  disabled: false,
  selectedOption: jsonOption1,
  setSelectedOption,
};

describe('SchemaSelect', () => {
  afterEach(jest.clearAllMocks);

  it('Renders empty select when there are no provided options', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.DatamodelsMetadata, org, app], []);
    render({}, { queryClient });
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

const render = (
  props: Partial<ISchemaSelectProps> = {},
  data: RenderWithProvidersData = {},
  ) => {
  if (!data.queryClient) {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.DatamodelsMetadata, org, app], metadata);
    data.queryClient = queryClient;
  }
  return renderWithProviders(data)(<SchemaSelect {...defaultProps} {...props} />);
};
