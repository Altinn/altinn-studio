import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnsattportenLogin } from './AnsattportenLogin';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('AnsattportenLogin', () => {
  it('should render the description paragraphs', () => {
    render(<AnsattportenLogin />);

    expect(
      screen.getByText(textMock('settings_modal.maskinporten_tab_login_with_description')),
    ).toBeInTheDocument();
  });

  it('should render the login button with correct label', () => {
    render(<AnsattportenLogin />);

    const button = screen.getByRole('button', {
      name: textMock('settings_modal.maskinporten_tab_login_with_ansattporten'),
    });
    expect(button).toBeInTheDocument();
  });

  it('should call the handleLoginWithAnsattporten function when login button is clicked', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(); // Mock console.log

    render(<AnsattportenLogin />);

    const button = screen.getByRole('button', {
      name: textMock('settings_modal.maskinporten_tab_login_with_ansattporten'),
    });
    await user.click(button);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Will be implemented in next iteration when backend is ready',
    );
    consoleSpy.mockRestore();
  });
});
