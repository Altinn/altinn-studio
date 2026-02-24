import React from 'react';
import { screen } from '@testing-library/react';
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
import { selectSuggestionOption } from '../utils/ValidateNavigationTestUtils';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';

const layouts = {
  Side1: {},
  Side2: {},
};

const layoutSets = {
  sets: [
    {
      id: layoutSet1NameMock,
      dataType: 'Task',
    },
  ],
};

describe('TasksSelector and TaskSelector', () => {
  it('should render correct label and call onChange when a task is selected in multiple mode', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    renderTasksSelector({ onChange: mockOnChange });
    const selectorLabel = textMock(
      'ux_editor.settings.navigation_validation_specific_task_label_several',
    );
    await selectSuggestionOption({ user, selectorLabel, optionLabel: layoutSet1NameMock });
    expect(mockOnChange).toHaveBeenCalledWith([
      { label: layoutSet1NameMock, value: layoutSet1NameMock },
    ]);
  });

  it('should render correct label and call onChange when a task is selected in single mode', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    renderTaskSelector({ onChange: mockOnChange });
    const selectorLabel = textMock('ux_editor.settings.navigation_validation_specific_task_label');
    await selectSuggestionOption({ user, selectorLabel, optionLabel: layoutSet1NameMock });
    expect(mockOnChange).toHaveBeenCalledWith({
      label: layoutSet1NameMock,
      value: layoutSet1NameMock,
    });
  });

  const renderTasksSelector = (props: Partial<TasksSelectorProps> = {}) => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.LayoutSets, org, app], layoutSets);

    const defaultProps: TasksSelectorProps = {
      selectedTasks: [],
      onChange: jest.fn(),
    };
    return renderWithProviders(<TasksSelector {...defaultProps} {...props} />, {
      queryClient,
    });
  };

  const renderTaskSelector = (props: Partial<TaskSelectorProps> = {}) => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.LayoutSets, org, app], layoutSets);

    const defaultProps: TaskSelectorProps = {
      selectedTask: null,
      onChange: jest.fn(),
    };
    return renderWithProviders(<TaskSelector {...defaultProps} {...props} />, {
      queryClient,
    });
  };
});

describe('PagesSelector', () => {
  it('should inform user that no pages are available when no task is selected', () => {
    renderPagesSelector();
    const emptyText = textMock(
      'ux_editor.settings.navigation_validation_specific_page_no_task_selected',
    );
    expect(screen.getByText(emptyText)).toBeInTheDocument();
  });

  it('should inform user that no pages are available when task is defined, but no pages available', () => {
    renderPagesSelector({ taskName: layoutSet1NameMock });
    const emptyText = textMock(
      'ux_editor.settings.navigation_validation_specific_page_no_pages_available',
    );
    expect(screen.getByText(emptyText)).toBeInTheDocument();
  });

  it('should call onChange when a page is selected', async () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSet1NameMock], layouts); // mock form layouts query to return two pages (Side1 and Side2)

    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    renderPagesSelector({ taskName: layoutSet1NameMock, onChange: mockOnChange }, queryClient);
    const selectorLabel = textMock('ux_editor.settings.navigation_validation_specific_page_label');
    await selectSuggestionOption({ user, selectorLabel, optionLabel: 'Side1' });
    expect(mockOnChange).toHaveBeenCalledWith([{ label: 'Side1', value: 'Side1' }]);
  });

  const renderPagesSelector = (
    props: Partial<PagesSelectorProps> = {},
    queryClientMock?: ReturnType<typeof createQueryClientMock>,
  ) => {
    const defaultProps: PagesSelectorProps = {
      taskName: undefined,
      selectedPages: [],
      onChange: jest.fn(),
    };
    return renderWithProviders(<PagesSelector {...defaultProps} {...props} />, {
      queryClient: queryClientMock,
    });
  };
});
