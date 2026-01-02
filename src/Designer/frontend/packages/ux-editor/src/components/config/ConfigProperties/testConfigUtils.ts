import { screen, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

export const getPropertyByRole = (role: string, property: string): HTMLElement | null => {
  return screen.queryByRole(role, {
    name: textMock(`ux_editor.component_properties.${property}`),
  });
};

export const saveConfigChanges = async () => {
  const user = userEvent.setup();
  const saveButton = screen.getByRole('button', { name: textMock('general.save') });
  await waitFor(() => expect(saveButton).toBeEnabled());
  await user.click(saveButton);
};

export const cancelConfigChanges = async () => {
  const user = userEvent.setup();
  const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
  await user.click(cancelButton);
};

export const openConfigAndVerify = async (property: string) => {
  const user = userEvent.setup();
  const propertyButton = getPropertyByRole('button', property);
  await user.click(propertyButton);
  const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
  expect(cancelButton).toBeInTheDocument();
};
