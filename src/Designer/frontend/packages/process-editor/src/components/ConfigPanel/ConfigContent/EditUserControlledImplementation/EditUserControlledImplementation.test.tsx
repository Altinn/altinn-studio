import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditUserControlledImplementation } from './EditUserControlledImplementation';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useGetDefaultUserControlledSigningInterfaceId } from './useGetDefaultUserControlledSigningInterfaceId';
import { useUpdateUserControlledImplementation } from './useUpdateUserControlledImplementation';

vi.mock('./useGetDefaultUserControlledSigningInterfaceId', () => ({
  useGetDefaultUserControlledSigningInterfaceId: vi.fn(),
}));

vi.mock('./useUpdateUserControlledImplementation', () => ({
  useUpdateUserControlledImplementation: vi.fn(),
}));

const mockUseGetDefault = useGetDefaultUserControlledSigningInterfaceId as Mock;
const mockUseUpdate = useUpdateUserControlledImplementation as Mock;

describe('EditUserControlledImplementation', (): void => {
  afterEach(() => vi.clearAllMocks());

  it('should render as button with content', (): void => {
    renderEditUserControlledImplementation();
    expect(getToggleableTextFieldButton()).toBeEnabled();
  });

  it('should render with label, description and default value', async (): Promise<void> => {
    const expectedDisplayValue = 'some-default-id';
    const user = userEvent.setup();
    mockUseGetDefault.mockReturnValue(expectedDisplayValue);
    mockUseUpdate.mockReturnValue(vi.fn());

    renderEditUserControlledImplementation();
    await user.click(getToggleableTextFieldButton());

    expect(getToggleableTextFieldByLabel()).toBeInTheDocument();
    expect(getToggleableTextFieldDescription()).toBeInTheDocument();
    expect(screen.getByDisplayValue(expectedDisplayValue)).toBeInTheDocument();
  });

  it('should call updateUserControlledImplementation on blur with the new value', async (): Promise<void> => {
    const newId = 'new-id';
    const user = userEvent.setup();
    const mockUpdateFn = vi.fn();
    mockUseGetDefault.mockReturnValue('initial-id');
    mockUseUpdate.mockReturnValue(mockUpdateFn);

    renderEditUserControlledImplementation();
    await user.click(getToggleableTextFieldButton());

    const textField = getToggleableTextFieldByLabel();
    await user.clear(textField);
    await user.type(textField, newId);
    await user.tab();

    expect(mockUpdateFn).toHaveBeenCalledWith(newId);
  });
});

function renderEditUserControlledImplementation(): void {
  render(<EditUserControlledImplementation />);
}

function getToggleableTextFieldButton(): HTMLButtonElement {
  return screen.getByRole('button', {
    name: textMock('process_editor.configuration_panel.edit_default_user_controlled_interface'),
  });
}

function getToggleableTextFieldByLabel(): HTMLInputElement {
  return screen.getByLabelText(
    textMock('process_editor.configuration_panel.edit_default_user_controlled_interface'),
  );
}

function getToggleableTextFieldDescription(): HTMLElement {
  return screen.getByText(
    textMock(
      'process_editor.configuration_panel.edit_default_user_controlled_interface_description',
    ),
  );
}
