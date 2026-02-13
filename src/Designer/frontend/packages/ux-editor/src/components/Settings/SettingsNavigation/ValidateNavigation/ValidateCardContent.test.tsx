import React from 'react';
import { render, screen } from '@testing-library/react';
import { ValidateCardContent, ValidateCardContentProps } from './ValidateCardContent';
import { Scope } from './ValidateNavigationUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent, { UserEvent } from '@testing-library/user-event';

describe('ValidateCardContent', () => {
  it('renders page selector when scope is SelectedPages', () => {
    renderValidateCardContent({ scope: Scope.SelectedPages });
    const pageSelector = screen.getByText(
      textMock('ux_editor.settings.navigation_validation_specific_page_label'),
    );
    expect(pageSelector).toBeInTheDocument();
  });

  it('should not render task or page selector when scope is AllTasks', () => {
    renderValidateCardContent({ scope: Scope.AllTasks });
    const taskSelector = screen.queryByText(
      textMock('ux_editor.settings.navigation_validation_specific_task_label_several'),
    );
    const pageSelector = screen.queryByText(
      textMock('ux_editor.settings.navigation_validation_specific_page_label'),
    );
    expect(taskSelector).not.toBeInTheDocument();
    expect(pageSelector).not.toBeInTheDocument();
  });

  it('should call onChange with correct values when task is changed in SelectedTasks scope', async () => {
    const user = userEvent.setup();

    const mockOnChange = jest.fn();
    renderValidateCardContent({ scope: Scope.SelectedTasks, onChange: mockOnChange });
    await selectTask({ user, optionLabel: 'Oppgave 1', multiple: true });

    expect(mockOnChange).toHaveBeenCalledWith({
      tasks: [{ label: 'Oppgave 1', value: 'Oppgave 1' }],
    });
  });

  it('should call onChange with correct values when task is changed in SelectedPages scope', async () => {
    const user = userEvent.setup();

    const mockOnChange = jest.fn();
    renderValidateCardContent({ scope: Scope.SelectedPages, onChange: mockOnChange });

    await selectTask({ user, optionLabel: 'Oppgave 1' });

    expect(mockOnChange).toHaveBeenCalledWith({
      task: { label: 'Oppgave 1', value: 'Oppgave 1' },
      pages: [],
    });
  });
});

type SelectOption = {
  user: UserEvent;
  optionLabel: string;
  multiple?: boolean;
};

const selectTask = async ({ user, optionLabel, multiple }: SelectOption) => {
  const taskSelector = screen.getByRole('textbox', {
    name: textMock(
      `ux_editor.settings.navigation_validation_specific_task_label${multiple ? '_several' : ''}`,
    ),
  });
  await user.type(taskSelector, optionLabel);
  await user.keyboard('{Enter}');
};

const renderValidateCardContent = ({
  scope,
  onChange = jest.fn(),
}: Partial<ValidateCardContentProps>) => {
  const mockConfig = {
    types: [],
    pageScope: '',
    tasks: [],
  };

  render(<ValidateCardContent scope={scope} config={mockConfig} onChange={onChange} />);
};
