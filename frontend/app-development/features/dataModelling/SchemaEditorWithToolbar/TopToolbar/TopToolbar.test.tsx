import React from 'react';
import type { TopToolbarProps } from './TopToolbar';
import { TopToolbar } from './TopToolbar';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { jsonMetadata1Mock } from '../../../../../packages/schema-editor/test/mocks/metadataMocks';
import { QueryKey } from 'app-shared/types/QueryKey';
import { uiSchemaNodesMock } from '../../../../../packages/schema-editor/test/mocks/uiSchemaMock';
import type { MetadataOption } from '../../../../types/MetadataOption';
import { convertMetadataToOption } from '../../../../utils/metadataUtils';
import { buildJsonSchema } from '@altinn/schema-model';
import { renderWithProviders } from '../../../../test/mocks';
import { useQueryClient } from '@tanstack/react-query';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { app, org } from '@studio/testing/testids';
import { textMock } from '@studio/testing/mocks/i18nMock';

const user = userEvent.setup();

// Test data:
const generateText = textMock('schema_editor.generate_model_files');
const generalErrorMessage = textMock('general.error_message');
const dataModelGenerationSuccessMessage = textMock(
  'schema_editor.data_model_generation_success_message',
);
const savingText = textMock('general.saving');

const setCreateNewOpen = jest.fn();
const setSelectedOption = jest.fn();
const onSetSchemaGenerationErrorMessages = jest.fn();
const selectedOption: MetadataOption = convertMetadataToOption(jsonMetadata1Mock);
const defaultProps: TopToolbarProps = {
  createNewOpen: false,
  dataModels: [jsonMetadata1Mock],
  selectedOption,
  setCreateNewOpen,
  setSelectedOption,
  onSetSchemaGenerationErrorMessages,
};
const modelPath = jsonMetadata1Mock.repositoryRelativeUrl;

const renderToolbar = (
  props: Partial<TopToolbarProps> = {},
  servicesContextProps: Partial<ServicesContextProps> = {},
) => {
  const TopToolbarWithInitData = () => {
    const queryClient = useQueryClient();
    queryClient.setQueryData(
      [QueryKey.JsonSchema, org, app, modelPath],
      buildJsonSchema(uiSchemaNodesMock),
    );
    return <TopToolbar {...defaultProps} {...props} />;
  };

  return renderWithProviders(<TopToolbarWithInitData />, {
    queries: servicesContextProps,
  });
};

describe('TopToolbar', () => {
  afterEach(jest.clearAllMocks);

  it('renders the top toolbar', () => {
    renderToolbar();
    const topToolbar = screen.getByRole('toolbar');
    expect(topToolbar).toBeDefined();
  });

  it('handles a click on the generate button', async () => {
    renderToolbar({}, {});
    const topToolbar = screen.getByRole('toolbar');
    expect(topToolbar).toBeDefined();
    const generateButton = screen.getByRole('button', { name: generateText });
    expect(generateButton).toBeDefined();
    await user.click(generateButton);
    expect(queriesMock.generateModels).toHaveBeenCalledTimes(1);
  });

  it('Does not show any error by default', () => {
    renderToolbar();
    expect(screen.queryAllByRole('alertdialog')).toHaveLength(0);
  });

  it('Shows error message when the "generate" button is clicked and a schema error is provided', async () => {
    renderToolbar(
      {},
      {
        generateModels: jest.fn().mockImplementation(() => Promise.reject()),
      },
    );
    await user.click(screen.getByRole('button', { name: generateText }));
    expect(await screen.findByRole('alert')).toHaveTextContent(generalErrorMessage);
  });

  it('Hides spinner while not loading', () => {
    renderToolbar();
    expect(screen.queryAllByTitle(savingText)).toHaveLength(0);
  });

  it('Shows success message when the "generate" button is clicked and there is no error', async () => {
    renderToolbar({});
    await user.click(screen.getByRole('button', { name: generateText }));
    expect(await screen.findByRole('alert')).toHaveTextContent(dataModelGenerationSuccessMessage);
  });
});
