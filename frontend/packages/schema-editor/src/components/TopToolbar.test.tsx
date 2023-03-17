import React from 'react';
import { TopToolbar, TopToolbarProps } from './TopToolbar';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockUseTranslation } from '../../../../testing/mocks/i18nMock';
import { act } from 'react-dom/test-utils';
import { dataMock } from '@altinn/schema-editor/mockData';

const user = userEvent.setup();

// Test data:
const closeText = 'Close';
const editText = 'Edit'
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
const saveAction = jest.fn();
const toggleEditMode = jest.fn();
const Toolbar = <div/>;
const defaultProps: TopToolbarProps = {
  Toolbar,
  saveAction,
  toggleEditMode,
  editMode: true,
  schema: dataMock,
  schemaState: { saving: false },
}

const renderToolbar = (props: Partial<TopToolbarProps> = {}) =>
  render(<TopToolbar {...defaultProps} {...props} />);

// Mocks:
jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation(texts) }));

describe('TopToolbar', () => {
  afterEach(jest.clearAllMocks);

  it('renders the top toolbar', () => {
    renderToolbar();
    const topToolbar = screen.getByRole('toolbar');
    expect(topToolbar).toBeDefined();
  });

  it('handles a click on the save button', async () => {
    renderToolbar();
    const topToolbar = screen.getByRole('toolbar');
    expect(topToolbar).toBeDefined();
    const saveButton = screen.getByTestId('save-model-button');
    expect(saveButton).toBeDefined();
    await act(() => user.click(saveButton));
    expect(saveAction).toHaveBeenCalledTimes(1);
  });

  it('handles a click on the toggle edit mode button', async () => {
    renderToolbar();
    const topToolbar = screen.getByRole('toolbar');
    expect(topToolbar).toBeDefined();
    const toggleEditModeButton = screen.getByText(editText);
    expect(toggleEditModeButton).toBeDefined();
    await act(() => user.click(toggleEditModeButton));
    expect(toggleEditMode).toHaveBeenCalledTimes(1);
  });

  it('Does not show any error by default', () => {
    renderToolbar();
    expect(screen.queryAllByRole('alertdialog')).toHaveLength(0);
  });

  it('Shows error message when the "generate" button is clicked and a schema error is provided', async () => {
    const message = 'Error message';
    const schemaState = { saving: false, error: { name: 'error', message } };
    renderToolbar({ schemaState });
    await act(() => user.click(screen.getByRole('button', { name: generateText })));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toHaveTextContent(message);
  });

  it('Hides schema error popover when the "close" button is clicked', async () => {
    const schemaState = { saving: false, error: { name: 'error', message: 'message' } };
    renderToolbar({ schemaState });
    await act(() => user.click(screen.getByRole('button', { name: generateText })));
    await act(() => user.click(screen.getByRole('button', { name: closeText })));
    expect(screen.queryAllByRole('dialog')).toHaveLength(0);
  });

  it('Hides schema error popover when component is rerendered without schema error', async () => {
    const schemaState = { saving: false, error: { name: 'error', message: 'message' } };
    const { rerender } = renderToolbar({ schemaState });
    await act(() => user.click(screen.getByRole('button', { name: generateText })));
    await act(() => user.click(screen.getByRole('button', { name: closeText })));
    rerender(<TopToolbar {...defaultProps} />);
    expect(screen.queryAllByRole('dialog')).toHaveLength(0);
  });

  it('Shows spinner while schemaState.saving is true', () => {
    renderToolbar({ schemaState: { saving: true } });
    expect(screen.getByTitle(savingText)).toBeInTheDocument();
  });

  it('Hides spinner while schemaState.saving is false', () => {
    renderToolbar();
    expect(screen.queryAllByTitle(savingText)).toHaveLength(0);
  });

  it('Shows "saved" message when the "generate" button is clicked and there is no error', async () => {
    renderToolbar();
    await act(() => user.click(screen.getByRole('button', { name: generateText })));
    expect(screen.getByRole('dialog')).toHaveTextContent(savedText);
  });

  it('Hides generation status popover when switching schema', async () => {
    const { rerender } = renderToolbar();
    await act(() => user.click(screen.getByRole('button', { name: generateText })));
    rerender(<TopToolbar {...defaultProps} schema={{ ...dataMock, $id: 'New id' }} />);
    expect(screen.queryAllByRole('dialog')).toHaveLength(0);
  });
});
