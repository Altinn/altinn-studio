import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LibraryOptionsEditor } from './LibraryOptionsEditor';
import { useOptionListQuery, useUpdateOptionListMutation } from 'app-shared/hooks/queries';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { Option } from 'app-shared/types/Option';

// Mock the hooks
jest.mock('app-shared/hooks/queries');
jest.mock('app-development/contexts/PreviewContext');
jest.mock('app-shared/hooks/useStudioEnvironmentParams');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockOptionsList: Option[] = [
  { label: 'Option 1', value: '1' },
  { label: 'Option 2', value: '2' },
];

const mockUpdateMutate = jest.fn();
const mockDoReloadPreview = jest.fn();
const mockHandleDelete = jest.fn();

describe('LibraryOptionsEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useOptionListQuery as jest.Mock).mockReturnValue({
      data: mockOptionsList,
    });

    (useUpdateOptionListMutation as jest.Mock).mockReturnValue({
      mutate: mockUpdateMutate,
    });

    (usePreviewContext as jest.Mock).mockReturnValue({
      doReloadPreview: mockDoReloadPreview,
    });

    (useStudioEnvironmentParams as jest.Mock).mockReturnValue({
      org: 'testOrg',
      app: 'testApp',
    });
  });

  it('renders options list labels and buttons', () => {
    render(<LibraryOptionsEditor optionsId='test-id' handleDelete={mockHandleDelete} />);

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('opens modal when edit button is clicked', async () => {
    render(<LibraryOptionsEditor optionsId='test-id' handleDelete={mockHandleDelete} />);

    const editButton = screen.getByRole('button', { name: /edit/i });
    await act(async () => {
      await userEvent.click(editButton);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText('ux_editor.options.modal_header_library_code_list'),
    ).toBeInTheDocument();
  });

  it('calls handleDelete when delete button is clicked', async () => {
    render(<LibraryOptionsEditor optionsId='test-id' handleDelete={mockHandleDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await act(async () => {
      await userEvent.click(deleteButton);
    });

    expect(mockHandleDelete).toHaveBeenCalledTimes(1);
  });

  it('updates options and reloads preview when options change', async () => {
    render(<LibraryOptionsEditor optionsId='test-id' handleDelete={mockHandleDelete} />);

    const editButton = screen.getByRole('button', { name: /edit/i });
    await act(async () => {
      await userEvent.click(editButton);
    });

    // Simulate option change in StudioCodeListEditor
    const updatedOptions = [...mockOptionsList, { label: 'Option 3', value: '3' }];
    const codeListEditor = screen.getByRole('grid');
    await act(async () => {
      // Trigger the onBlurAny callback
      codeListEditor.dispatchEvent(new Event('blur'));
    });

    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalledWith({
        optionListId: 'test-id',
        optionsList: expect.any(Array),
      });
      expect(mockDoReloadPreview).toHaveBeenCalled();
    });
  });

  it('displays warning alert in modal footer', async () => {
    render(<LibraryOptionsEditor optionsId='test-id' handleDelete={mockHandleDelete} />);

    const editButton = screen.getByRole('button', { name: /edit/i });
    await act(async () => {
      await userEvent.click(editButton);
    });

    expect(
      screen.getByText('ux_editor.modal_properties_code_list_alert_title'),
    ).toBeInTheDocument();
  });
});
