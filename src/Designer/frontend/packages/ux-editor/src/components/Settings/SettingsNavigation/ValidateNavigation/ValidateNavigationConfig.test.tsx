import React from 'react';
import { render, screen } from '@testing-library/react';
import { Scope } from './ValidateNavigationUtils';
import {
  ValidateNavigationConfig,
  type ValidateNavigationConfigProps,
} from './ValidateNavigationConfig';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';

const propertyLabel = 'Test Property';
const allTasksCardLabel = textMock('ux_editor.settings.navigation_validation_all_tasks_card_label');

describe('ValidateNavigationConfig', () => {
  it('renders add validation rule button when in view mode', () => {
    renderValidateNavigationConfig({ scope: Scope.AllTasks });

    const addButton = screen.getByRole('button', { name: propertyLabel });
    expect(addButton).toBeInTheDocument();
  });

  it('renders config card when button is clicked', async () => {
    const user = userEvent.setup();
    renderValidateNavigationConfig({ scope: Scope.AllTasks });

    await openCard(user);
    const configCard = screen.getByText(allTasksCardLabel);
    expect(configCard).toBeInTheDocument();
  });

  const actionLabels = {
    save: 'general.save',
    cancel: 'general.cancel',
    delete: 'general.delete',
  };
  (Object.entries(actionLabels) as [keyof typeof actionLabels, string][]).forEach(
    ([action, label]) => {
      it(`should close config card when ${action} button is clicked`, async () => {
        const user = userEvent.setup();
        renderValidateNavigationConfig({ scope: Scope.AllTasks });

        await openCard(user);
        await user.click(screen.getByRole('button', { name: textMock(label) }));
        expect(screen.queryByText(allTasksCardLabel)).not.toBeInTheDocument();
      });
    },
  );
});

const openCard = async (user: UserEvent) => {
  const addButton = screen.getByRole('button', { name: propertyLabel });
  await user.click(addButton);
};

const renderValidateNavigationConfig = (props: Partial<ValidateNavigationConfigProps> = {}) => {
  const defaultProps: ValidateNavigationConfigProps = {
    propertyLabel,
    scope: Scope.AllTasks,
  };
  return render(<ValidateNavigationConfig {...defaultProps} {...props} />);
};
