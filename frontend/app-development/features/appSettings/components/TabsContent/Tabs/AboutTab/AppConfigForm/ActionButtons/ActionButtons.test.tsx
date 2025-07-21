import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { ActionButtons } from './ActionButtons';
import type { ActionButtonsProps } from './ActionButtons';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('ActionButtons', () => {
  afterEach(jest.clearAllMocks);

  it('renders both buttons with correct labels and icons', () => {
    renderActionButtons();

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    const resetButton = getButton(textMock('app_settings.about_tab_reset_button'));

    expect(saveButton).toBeInTheDocument();
    expect(resetButton).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    renderActionButtons({ onSave });

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onReset when reset button is clicked', async () => {
    const user = userEvent.setup();
    const onReset = jest.fn();
    renderActionButtons({ onReset });

    const resetButton = getButton(textMock('app_settings.about_tab_reset_button'));
    await user.click(resetButton);

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('disables both buttons when areButtonsDisabled is true', () => {
    const areButtonsDisabled: boolean = true;
    renderActionButtons({ areButtonsDisabled });

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    const resetButton = getButton(textMock('app_settings.about_tab_reset_button'));

    expect(saveButton).toBeDisabled();
    expect(resetButton).toBeDisabled();
  });

  it('enables both buttons when areButtonsDisabled is false', () => {
    const areButtonsDisabled: boolean = false;
    renderActionButtons({ areButtonsDisabled });

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    const resetButton = getButton(textMock('app_settings.about_tab_reset_button'));

    expect(saveButton).toBeEnabled();
    expect(resetButton).toBeEnabled();
  });
});

const defaultProps: ActionButtonsProps = {
  onSave: jest.fn(),
  onReset: jest.fn(),
  areButtonsDisabled: false,
};

function renderActionButtons(props: Partial<ActionButtonsProps> = {}): RenderResult {
  return render(<ActionButtons {...defaultProps} {...props} />);
}

const getButton = (name: string): HTMLButtonElement => screen.getByRole('button', { name });
