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

// Test data:
const org = 'org';
const app = 'app';
const metadata: DatamodelMetadata[] = [jsonMetadata1Mock, jsonMetadata2Mock];
const selectedOption = convertMetadataToOption(jsonMetadata1Mock);
const setSelectedOption = jest.fn();
const defaultProps: ISchemaSelectProps = {
  disabled: false,
  selectedOption,
  setSelectedOption,
};

describe('SchemaSelect', () => {

  it('should render empty select when there are no provided options', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.DatamodelsMetadata, org, app], metadata);
    render({}, { queryClient });
    const selectComponent = screen.getByRole('combobox');
    expect(selectComponent.getAttribute('value')).toBe('');
  });

  it('should not select any item when there are provided options but no selected item provided', async () => {
    render({ selectedOption: null });
    const selectedOptionText = screen.queryByText(selectedOption.label);
    expect(selectedOptionText).toBeNull();
  });

  it('should select provided selected item when there are provided options', async () => {
    render({ selectedOption });
    const selectedOptionText = screen.getByText(selectedOption.label);
    expect(selectedOptionText).toBeVisible();
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
