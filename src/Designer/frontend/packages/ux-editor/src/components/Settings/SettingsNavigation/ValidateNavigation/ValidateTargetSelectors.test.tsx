import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  PagesSelector,
  type PagesSelectorProps,
  TaskSelector,
  type TaskSelectorProps,
  TasksSelector,
  type TasksSelectorProps,
} from './ValidateTargetSelectors';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { selectSuggestionOption } from './ValidateNavigationTestUtils';

describe('TasksSelector and TaskSelector', () => {
  it('should render correct label and call onChange when a task is selected in multiple mode', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    renderTasksSelector({ onChange: mockOnChange });
    const selectorLabel = textMock(
      'ux_editor.settings.navigation_validation_specific_task_label_several',
    );
    await selectSuggestionOption({ user, selectorLabel, optionLabel: 'Oppgave 1' });
    expect(mockOnChange).toHaveBeenCalledWith([{ label: 'Oppgave 1', value: 'Oppgave 1' }]);
  });

  it('should render correct label and call onChange when a task is selected in single mode', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    renderTaskSelector({ onChange: mockOnChange });
    const selectorLabel = textMock('ux_editor.settings.navigation_validation_specific_task_label');
    await selectSuggestionOption({ user, selectorLabel, optionLabel: 'Oppgave 2' });
    expect(mockOnChange).toHaveBeenCalledWith({ label: 'Oppgave 2', value: 'Oppgave 2' });
  });

  const renderTasksSelector = (props: Partial<TasksSelectorProps> = {}) => {
    const defaultProps: TasksSelectorProps = {
      selectedTasks: [],
      onChange: jest.fn(),
    };
    return render(<TasksSelector {...defaultProps} {...props} />);
  };

  const renderTaskSelector = (props: Partial<TaskSelectorProps> = {}) => {
    const defaultProps: TaskSelectorProps = {
      selectedTask: null,
      onChange: jest.fn(),
    };
    return render(<TaskSelector {...defaultProps} {...props} />);
  };
});

describe('PagesSelector', () => {
  it('should inform user that no pages are available when no task is selected', () => {
    renderPagesSelector();
    const emptyText = textMock('ux_editor.settings.navigation_validation_specific_page_no_pages');
    expect(screen.getByText(emptyText)).toBeInTheDocument();
  });

  it('should call onChange when a page is selected', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    renderPagesSelector({ taskName: 'Test Task', onChange: mockOnChange });
    const selectorLabel = textMock('ux_editor.settings.navigation_validation_specific_page_label');
    await selectSuggestionOption({ user, selectorLabel, optionLabel: 'Side 1' });
    expect(mockOnChange).toHaveBeenCalledWith([{ label: 'Side 1', value: 'Side 1' }]);
  });

  const renderPagesSelector = (props: Partial<PagesSelectorProps> = {}) => {
    const defaultProps: PagesSelectorProps = {
      taskName: undefined,
      selectedPages: [],
      onChange: jest.fn(),
    };
    return render(<PagesSelector {...defaultProps} {...props} />);
  };
});
