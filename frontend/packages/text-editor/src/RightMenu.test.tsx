import React from 'react';
import { screen, fireEvent, waitFor, render } from '@testing-library/react';
import { RightMenu } from './RightMenu';

describe('RightMenu', () => {
  const mockAddLanguage = jest.fn();
  const mockDeleteLanguage = jest.fn();
  const defaultProps = {
    addLanguage: mockAddLanguage,
    availableLanguages: ['en', 'fr'],
    deleteLanguage: mockDeleteLanguage,
    selectedLanguages: ['en'],
    setSelectedLanguages: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('displays and handles popover for deleting a language', async () => {
    render(<RightMenu {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTestId('delete-en');
    fireEvent.click(deleteButton);
    const popoverContent = screen.getByText(/schema_editor.language_display_confirm_delete/);
    expect(popoverContent).toBeInTheDocument();
    const confirmButton = screen.getByText(/schema_editor.language_conferm_deletion/);
    fireEvent.click(confirmButton);
    expect(defaultProps.deleteLanguage).toHaveBeenCalledWith('en');
    const cancelButton = screen.getByText(/schema_editor.textRow-cancel-popover/);
    fireEvent.click(cancelButton);
  });

  test('calls deleteLanguage with the correct language code when confirm deletion button is clicked', async () => {
    render(<RightMenu {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTestId('delete-en');
    fireEvent.click(deleteButton);
    const confirmButton = screen.getByText(/schema_editor.language_conferm_deletion/);
    fireEvent.click(confirmButton);
    expect(defaultProps.deleteLanguage).toHaveBeenCalledWith('en');
  });

  test('closes the popover when cancel button is clicked', () => {
    jest.spyOn(console, 'error').mockImplementation();
    render(<RightMenu {...defaultProps} />);

    const deleteButton = screen.getByTestId('delete-en');
    fireEvent.click(deleteButton);
    const cancelButton = screen.getByText(/schema_editor.textRow-cancel-popover/);
    fireEvent.click(cancelButton);
    const popoverContent = screen.queryByText(/schema_editor.language_display_confirm_delete/);
    expect(popoverContent).not.toBeInTheDocument();
  });
});
