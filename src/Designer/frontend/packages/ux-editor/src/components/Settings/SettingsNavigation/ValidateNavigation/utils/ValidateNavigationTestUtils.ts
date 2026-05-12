import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

type SelectOption = {
  user: UserEvent;
  selectorLabel: string;
  optionLabel: string;
};

export const selectSuggestionOption = async ({
  user,
  selectorLabel,
  optionLabel,
}: SelectOption) => {
  const selector = await screen.findByRole('combobox', {
    name: (name) => name.startsWith(selectorLabel),
  }); // Todo: Use selectorLabel directly when https://github.com/digdir/designsystemet/issues/4626 is fixed
  await user.click(selector);
  const option = await screen.findByRole('option', { name: optionLabel });
  await user.click(option);
};
