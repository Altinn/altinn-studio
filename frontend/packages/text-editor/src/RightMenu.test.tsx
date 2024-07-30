import React from 'react';
import { screen, waitFor, render as rtlRender } from '@testing-library/react';
import { RightMenu } from './RightMenu';
import userEvent from '@testing-library/user-event';
import { deleteButtonId } from '@studio/testing/testids';

const user = userEvent.setup();

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

  const render = async () => {
    rtlRender(<RightMenu {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  };

  describe('Delete confirmation dialog', () => {
    it('should open the vative confirmation dialog from browser when clicking the delete button', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      await render();

      const deleteButton = screen.getByTestId(deleteButtonId('en'));
      await user.click(deleteButton);

      expect(window.confirm).toHaveBeenCalled();
    });

    it('Should call deleteLanguage when user confirms', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      await render();

      const deleteButton = screen.getByTestId(deleteButtonId('en'));
      await user.click(deleteButton);

      expect(defaultProps.deleteLanguage).toHaveBeenCalledWith('en');
    });

    it("Should not call deleteLanguage when user doesn't confirm", async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);
      await render();

      const deleteButton = screen.getByTestId(deleteButtonId('en'));
      await user.click(deleteButton);

      expect(defaultProps.deleteLanguage).toHaveBeenCalledTimes(0);
    });

    it('Should close the confirmation dialog and not calling deleteLanguae when clicking the cancel button', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);
      await render();

      const deleteButton = screen.getByTestId(deleteButtonId('en'));
      await user.click(deleteButton);

      expect(defaultProps.deleteLanguage).toHaveBeenCalledTimes(0);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
  });
});
