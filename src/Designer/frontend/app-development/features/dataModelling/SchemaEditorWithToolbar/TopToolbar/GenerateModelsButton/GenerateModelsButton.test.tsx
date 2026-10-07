import { screen, waitFor } from '@testing-library/react';
import type { QueryClient } from '@tanstack/react-query';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithProviders } from '../../../../../test/mocks';
import type { GenerateModelsButtonProps } from './GenerateModelsButton';
import { GenerateModelsButton } from './GenerateModelsButton';

const modelPath = 'App/models/model.schema.json';
const pendingText = textMock('schema_editor.generate_model_files_pending');
const buttonText = textMock('schema_editor.generate_model_files');
const defaultProps: GenerateModelsButtonProps = {
  modelPath,
  onSetSchemaGenerationErrorMessages: jest.fn(),
};

describe('GenerateModelsButton', () => {
  afterEach(jest.clearAllMocks);

  it('asks the backend whether the model files are out of date', async () => {
    renderGenerateModelsButton();

    await waitFor(() =>
      expect(queriesMock.getDataModelGenerationStatus).toHaveBeenCalledWith(org, app, modelPath),
    );
  });

  it('marks the button when the model files are out of date', async () => {
    renderGenerateModelsButton({}, { getDataModelGenerationStatus: modelFilesOutOfDate(true) });

    expect(await screen.findByRole('status', { name: pendingText })).toBeInTheDocument();
  });

  it('does not mark the button when the model files are up to date', async () => {
    renderGenerateModelsButton({}, { getDataModelGenerationStatus: modelFilesOutOfDate(false) });

    expect(await screen.findByRole('button', { name: buttonText })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: pendingText })).not.toBeInTheDocument();
  });
});

const modelFilesOutOfDate = (isOutOfDate: boolean) =>
  jest.fn().mockImplementation(() => Promise.resolve(isOutOfDate));

const renderGenerateModelsButton = (
  props: Partial<GenerateModelsButtonProps> = {},
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) =>
  renderWithProviders(queries, queryClient)(<GenerateModelsButton {...defaultProps} {...props} />);
