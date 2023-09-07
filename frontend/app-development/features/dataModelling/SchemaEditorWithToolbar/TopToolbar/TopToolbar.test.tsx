import React from 'react';
import { TopToolbar, TopToolbarProps } from './TopToolbar';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockUseTranslation } from '../../../../../testing/mocks/i18nMock';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { jsonMetadata1Mock } from '../../../../../packages/schema-editor/test/mocks/metadataMocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { uiSchemaNodesMock } from '../../../../../packages/schema-editor/test/mocks/uiSchemaMock';
import { MetadataOption } from '../../../../types/MetadataOption';
import { convertMetadataToOption } from '../../../../utils/metadataUtils';
import { buildJsonSchema } from '@altinn/schema-model';
import { renderWithMockStore } from '../../../../test/mocks';

const user = userEvent.setup();

// Test data:
const closeText = 'Close';
const editText = 'Edit';
const generateText = 'Generate';
const savedText = 'Saved';
const savingText = 'Saving';
const texts = {
  'general.close': closeText,
  'general.saved': savedText,
  'general.saving': savingText,
  'schema_editor.edit_mode': editText,
  'schema_editor.generate_model_files': generateText,
};
const setCreateNewOpen = jest.fn();
const setSelectedOption = jest.fn();
const selectedOption: MetadataOption = convertMetadataToOption(jsonMetadata1Mock);
const defaultProps: TopToolbarProps = {
  createNewOpen: false,
  datamodels: [jsonMetadata1Mock],
  selectedOption,
  setCreateNewOpen,
  setSelectedOption,
};
const org = 'org';
const app = 'app';
const generateModels = jest.fn().mockImplementation(() => Promise.resolve());
const modelPath = jsonMetadata1Mock.repositoryRelativeUrl;

const renderToolbar = (
  props: Partial<TopToolbarProps> = {},
  servicesContextProps: Partial<ServicesContextProps> = {},
) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.JsonSchema, org, app, modelPath], buildJsonSchema(uiSchemaNodesMock));
  return renderWithMockStore(
    {},
    { generateModels, ...servicesContextProps },
    queryClient
  )(<TopToolbar {...defaultProps} {...props} />);
};

// Mocks:
jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation(texts) }));

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
    await act(() => user.click(generateButton));
    expect(generateModels).toHaveBeenCalledTimes(1);
  });

  it('Does not show any error by default', () => {
    renderToolbar();
    expect(screen.queryAllByRole('alertdialog')).toHaveLength(0);
  });

  it('Shows error message when the "generate" button is clicked and a schema error is provided', async () => {
    const message = 'Error message';
    renderToolbar({}, {
      generateModels: jest.fn().mockImplementation(() => Promise.reject({ message })),
    });
    await act(() => user.click(screen.getByRole('button', { name: generateText })));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toHaveTextContent(message);
  });

  it('Hides schema error popover when the "close" button is clicked', async () => {
    const message = 'Error message';
    renderToolbar({}, {
      generateModels: jest.fn().mockImplementation(() => Promise.reject({ message })),
    });
    await act(() => user.click(screen.getByRole('button', { name: generateText })));
    await act(() => user.click(screen.getByRole('button', { name: closeText })));
    expect(screen.queryAllByRole('dialog')).toHaveLength(0);
  });

  it('Hides schema error popover when component is rerendered without schema error', async () => {
    const message = 'Error message';
    const { renderResult: { rerender } } = renderToolbar({}, {
      generateModels: jest.fn().mockImplementation(() => Promise.reject({ message })),
    });
    await act(() => user.click(screen.getByRole('button', { name: generateText })));
    await act(() => user.click(screen.getByRole('button', { name: closeText })));
    rerender(<TopToolbar {...defaultProps} />);
    expect(screen.queryAllByRole('dialog')).toHaveLength(0);
  });

  it('Hides spinner while not loading', () => {
    renderToolbar();
    expect(screen.queryAllByTitle(savingText)).toHaveLength(0);
  });

  it('Shows "saved" message when the "generate" button is clicked and there is no error', async () => {
    renderToolbar({}, { generateModels });
    await act(() => user.click(screen.getByRole('button', { name: generateText })));
    expect(screen.getByRole('dialog')).toHaveTextContent(savedText);
  });
});
