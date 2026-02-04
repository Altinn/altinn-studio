import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { PdfAutomaticTaskSelection } from './PdfAutomaticTaskSelection';
import { createPdfBpmnDetails, renderWithProviders } from '../testUtils';

let mockTasks: any[] = [];

const defaultMockTasks = [
  {
    id: 'task_1',
    businessObject: {
      name: 'Task 1',
      extensionElements: {
        values: [{ taskType: 'data' }],
      },
    },
  },
  {
    id: 'task_2',
    businessObject: {
      name: 'Task 2',
      extensionElements: {
        values: [{ taskType: 'data' }],
      },
    },
  },
];

jest.mock('../../../../../utils/bpmnModeler/StudioModeler', () => {
  return {
    StudioModeler: jest.fn().mockImplementation(() => {
      return {
        getAllTasksByType: jest.fn(() => mockTasks),
      };
    }),
  };
});

const mockUpdateTaskIds = jest.fn();
jest.mock('../../../../../hooks/useUpdatePdfConfigTaskIds', () => ({
  useUpdatePdfConfigTaskIds: () => mockUpdateTaskIds,
}));

describe('PdfAutomaticTaskSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTasks = [...defaultMockTasks];
  });

  it('should render task selector combobox', () => {
    renderPdfAutomaticTaskSelection();

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should display available tasks as options', async () => {
    const user = userEvent.setup();

    renderPdfAutomaticTaskSelection();

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    expect(screen.getByRole('option', { name: /Task 1.*\(task_1\)/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Task 2.*\(task_2\)/ })).toBeInTheDocument();
  });

  it('should call updateTaskIds when selecting a task', async () => {
    const user = userEvent.setup();

    renderPdfAutomaticTaskSelection();

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    const option = screen.getByRole('option', { name: /Task 1.*\(task_1\)/ });
    await user.click(option);

    await waitFor(() => expect(mockUpdateTaskIds).toHaveBeenCalled());
    expect(mockUpdateTaskIds).toHaveBeenCalledWith(['task_1']);
  });

  it('should call updateTaskIds when deselecting a task', async () => {
    const user = userEvent.setup();

    renderPdfAutomaticTaskSelection(['task_1']);

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    const option = screen.getByRole('option', { name: /Task 1.*\(task_1\)/ });
    await user.click(option);

    await waitFor(() => expect(mockUpdateTaskIds).toHaveBeenCalledWith([]));
  });

  it('should call updateTaskIds when selecting multiple tasks', async () => {
    const user = userEvent.setup();

    renderPdfAutomaticTaskSelection();

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    await user.click(screen.getByRole('option', { name: /Task 1.*\(task_1\)/ }));
    await waitFor(() => expect(mockUpdateTaskIds).toHaveBeenCalledWith(['task_1']));

    await user.click(screen.getByRole('option', { name: /Task 2.*\(task_2\)/ }));
    await waitFor(() => expect(mockUpdateTaskIds).toHaveBeenLastCalledWith(['task_1', 'task_2']));
  });

  describe('edge cases', () => {
    it('should handle tasks without names by using empty string', async () => {
      const user = userEvent.setup();
      mockTasks = [
        {
          id: 'task_1',
          businessObject: {
            name: '',
            extensionElements: {
              values: [{ taskType: 'data' }],
            },
          },
        },
      ];

      renderPdfAutomaticTaskSelection();

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);

      expect(screen.getByRole('option', { name: /\(task_1\)/ })).toBeInTheDocument();
    });

    it('should handle tasks with undefined businessObject name', async () => {
      const user = userEvent.setup();
      mockTasks = [
        {
          id: 'task_1',
          businessObject: {
            extensionElements: {
              values: [{ taskType: 'data' }],
            },
          },
        },
      ];

      renderPdfAutomaticTaskSelection();

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);

      expect(screen.getByRole('option', { name: /\(task_1\)/ })).toBeInTheDocument();
    });

    it('should show empty state when no tasks are available', async () => {
      const user = userEvent.setup();
      mockTasks = [];

      renderPdfAutomaticTaskSelection();

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);

      expect(
        screen.getByText(textMock('process_editor.configuration_panel_pdf_no_tasks_to_select')),
      ).toBeInTheDocument();
    });
  });
});

const renderPdfAutomaticTaskSelection = (taskIds: string[] = []) => {
  const bpmnDetails = createPdfBpmnDetails({ taskIds });

  return renderWithProviders(<PdfAutomaticTaskSelection />, {
    bpmnContextProps: { bpmnDetails },
    bpmnApiContextProps: { layoutSets: { sets: [] } },
  });
};
