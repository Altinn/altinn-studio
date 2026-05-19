import { screen, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { type UserEvent } from '@testing-library/user-event';

export const getPropertyByRole = (role: string, property: string): HTMLElement | null => {
  return screen.queryByRole(role, {
    name: textMock(`ux_editor.component_properties.${property}`),
  });
};

export const saveConfigChanges = async (user: UserEvent) => {
  const saveButton = screen.getByRole('button', { name: textMock('general.save') });
  await waitFor(() => expect(saveButton).toBeEnabled());
  await user.click(saveButton);
};

export const cancelConfigAndVerify = async (user: UserEvent) => {
  const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
  await user.click(cancelButton);
  expect(cancelButton).not.toBeInTheDocument();
};

type OpenConfigAndVerifyProps = {
  user: UserEvent;
  property: string;
};

export const openConfigAndVerify = async ({ user, property }: OpenConfigAndVerifyProps) => {
  const propertyButton = getPropertyByRole('button', property);
  await user.click(propertyButton);
  const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
  expect(cancelButton).toBeInTheDocument();
};
