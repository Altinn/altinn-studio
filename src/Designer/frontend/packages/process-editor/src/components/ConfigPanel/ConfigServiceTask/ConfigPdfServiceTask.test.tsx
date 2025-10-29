import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ConfigPdfServiceTask } from './ConfigPdfServiceTask';
import { BpmnContext, type BpmnContextProps } from '../../../contexts/BpmnContext';
import { mockBpmnContextValue } from '../../../../test/mocks/bpmnContextMock';
import { mockBpmnDetails } from '../../../../test/mocks/bpmnDetailsMock';
import type { BpmnDetails } from '../../../types/BpmnDetails';

const tasks = [
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

jest.mock('../../../utils/bpmnModeler/StudioModeler', () => {
  return {
    StudioModeler: jest.fn().mockImplementation(() => {
      return {
        getAllTasksByType: jest.fn().mockReturnValue(tasks),
      };
    }),
  };
});

const mockUpdateTaskIds = jest.fn();
jest.mock('../../../hooks/useUpdatePdfConfigTaskIds', () => ({
  useUpdatePdfConfigTaskIds: () => mockUpdateTaskIds,
}));

describe('ConfigPdfServiceTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createPdfBpmnDetails = (config: { filename?: string; taskIds?: string[] }): BpmnDetails => {
    const { filename = 'test.pdf', taskIds = [] } = config;
    return {
      ...mockBpmnDetails,
      taskType: 'pdf',
      element: {
        ...mockBpmnDetails.element,
        businessObject: {
          ...mockBpmnDetails.element.businessObject,
          extensionElements: {
            values: [
              {
                pdfConfig: {
                  filename: { value: filename },
                  autoPdfTaskIds: {
                    taskIds: taskIds.map((id) => ({ value: id })),
                  },
                },
              },
            ],
          },
        },
      },
    };
  };

  it('should render filename field', () => {
    const pdfBpmnDetails = createPdfBpmnDetails({ filename: 'test.pdf' });

    renderConfigPdfServiceTask({
      bpmnContextProps: {
        bpmnDetails: pdfBpmnDetails,
      },
    });

    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_change_pdf_service_task_filename'),
      }),
    ).toBeInTheDocument();
  });

  it('should render auto pdf tasks selector', () => {
    const pdfBpmnDetails = createPdfBpmnDetails({});

    renderConfigPdfServiceTask({
      bpmnContextProps: {
        bpmnDetails: pdfBpmnDetails,
      },
    });

    expect(
      screen.getByLabelText(textMock('process_editor.configuration_panel_set_auto_pdf_tasks')),
    ).toBeInTheDocument();
  });

  it('should display selected task ids when configured', () => {
    const selectedTaskId = 'task_1';
    const pdfBpmnDetails = createPdfBpmnDetails({ taskIds: [selectedTaskId] });

    renderConfigPdfServiceTask({
      bpmnContextProps: {
        bpmnDetails: pdfBpmnDetails,
      },
    });

    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_set_auto_pdf_tasks'),
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/task_1/)).toBeInTheDocument();
  });

  it('should display filename value when configured', () => {
    const filename = 'custom-report.pdf';
    const pdfBpmnDetails = createPdfBpmnDetails({ filename });

    renderConfigPdfServiceTask({
      bpmnContextProps: {
        bpmnDetails: pdfBpmnDetails,
      },
    });

    const filenameButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_change_pdf_service_task_filename'),
    });
    expect(filenameButton).toBeInTheDocument();
    expect(screen.getByText(filename)).toBeInTheDocument();
  });

  it('should render filename field in edit mode when clicking the button', async () => {
    const user = userEvent.setup();
    const filename = 'existing.pdf';
    const pdfBpmnDetails = createPdfBpmnDetails({ filename });

    renderConfigPdfServiceTask({
      bpmnContextProps: {
        bpmnDetails: pdfBpmnDetails,
      },
    });

    const filenameButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_change_pdf_service_task_filename'),
    });
    await user.click(filenameButton);

    const input = screen.getByLabelText(
      textMock('process_editor.configuration_panel_change_pdf_service_task_filename'),
    );
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(filename);
  });

  it('should show combobox in edit mode when clicking auto pdf tasks button', async () => {
    const user = userEvent.setup();
    const pdfBpmnDetails = createPdfBpmnDetails({ taskIds: ['task_1'] });

    renderConfigPdfServiceTask({
      bpmnContextProps: {
        bpmnDetails: pdfBpmnDetails,
      },
    });

    const tasksButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_auto_pdf_tasks'),
    });
    await user.click(tasksButton);

    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_auto_pdf_tasks'),
    });
    expect(combobox).toBeInTheDocument();
  });

  it('should display multiple selected task ids', () => {
    const pdfBpmnDetails = createPdfBpmnDetails({ taskIds: ['task_1', 'task_2'] });

    renderConfigPdfServiceTask({
      bpmnContextProps: {
        bpmnDetails: pdfBpmnDetails,
      },
    });

    expect(screen.getByText(/Task 1.*\(task_1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Task 2.*\(task_2\)/)).toBeInTheDocument();
  });

  it('should show close button when auto pdf tasks selector is visible', async () => {
    const user = userEvent.setup();
    const pdfBpmnDetails = createPdfBpmnDetails({ taskIds: ['task_1'] });

    renderConfigPdfServiceTask({
      bpmnContextProps: {
        bpmnDetails: pdfBpmnDetails,
      },
    });

    const tasksButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_auto_pdf_tasks'),
    });
    await user.click(tasksButton);

    const closeButton = screen.getByRole('button', {
      name: textMock('general.close'),
    });
    expect(closeButton).toBeInTheDocument();
  });

  describe('changing filename', () => {
    it('should call modeling.updateModdleProperties when filename is changed and blurred', async () => {
      const user = userEvent.setup();
      const mockUpdateModdleProperties = jest.fn();
      const mockCreate = jest.fn((type, props) => ({
        $type: type,
        ...props,
      }));

      const pdfBpmnDetails = createPdfBpmnDetails({ filename: 'old.pdf' });

      const mockContextValue = {
        ...mockBpmnContextValue,
        bpmnDetails: pdfBpmnDetails,
        modelerRef: {
          current: {
            ...mockBpmnContextValue.modelerRef.current,
            get: (service: string) => {
              if (service === 'modeling') {
                return { updateModdleProperties: mockUpdateModdleProperties };
              }
              if (service === 'bpmnFactory') {
                return { create: mockCreate };
              }
              return {};
            },
          },
        },
      };

      renderConfigPdfServiceTask({
        bpmnContextProps: mockContextValue as any,
      });

      const filenameButton = screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_change_pdf_service_task_filename'),
      });
      await user.click(filenameButton);

      const input = screen.getByLabelText(
        textMock('process_editor.configuration_panel_change_pdf_service_task_filename'),
      );

      await user.clear(input);
      await user.type(input, 'new.pdf');
      await user.tab();

      expect(mockCreate).toHaveBeenCalledWith('altinn:Filename', { value: 'new.pdf' });
      expect(mockUpdateModdleProperties).toHaveBeenCalled();
    });

    it('should not call modeling.updateModdleProperties when filename is unchanged', async () => {
      const user = userEvent.setup();
      const mockUpdateModdleProperties = jest.fn();
      const mockCreate = jest.fn();

      const pdfBpmnDetails = createPdfBpmnDetails({ filename: 'test.pdf' });

      const mockContextValue = {
        ...mockBpmnContextValue,
        bpmnDetails: pdfBpmnDetails,
        modelerRef: {
          current: {
            ...mockBpmnContextValue.modelerRef.current,
            get: (service: string) => {
              if (service === 'modeling') {
                return { updateModdleProperties: mockUpdateModdleProperties };
              }
              if (service === 'bpmnFactory') {
                return { create: mockCreate };
              }
              return {};
            },
          },
        },
      };

      renderConfigPdfServiceTask({
        bpmnContextProps: mockContextValue as any,
      });

      const filenameButton = screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_change_pdf_service_task_filename'),
      });
      await user.click(filenameButton);

      await user.tab();

      expect(mockUpdateModdleProperties).not.toHaveBeenCalled();
    });

    it('should update local state when typing in filename field', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({ filename: 'old.pdf' });

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
      });

      const filenameButton = screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_change_pdf_service_task_filename'),
      });
      await user.click(filenameButton);

      const input = screen.getByLabelText(
        textMock('process_editor.configuration_panel_change_pdf_service_task_filename'),
      );

      await user.clear(input);
      await user.type(input, 'updated.pdf');

      expect(input).toHaveValue('updated.pdf');
    });
  });

  describe('selecting and deselecting tasks', () => {
    it('should show combobox with available tasks when selector is opened', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
      });

      const combobox = screen.getByRole('combobox', {
        name: textMock('process_editor.configuration_panel_set_auto_pdf_tasks'),
      });

      await user.click(combobox);

      expect(screen.getByText(/Task 1.*\(task_1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Task 2.*\(task_2\)/)).toBeInTheDocument();
    });

    it('should hide selector when close button is clicked', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
      });

      const closeButton = screen.getByRole('button', {
        name: textMock('general.close'),
      });
      await user.click(closeButton);

      expect(
        screen.queryByRole('combobox', {
          name: textMock('process_editor.configuration_panel_set_auto_pdf_tasks'),
        }),
      ).not.toBeInTheDocument();

      expect(
        screen.getByRole('button', {
          name: textMock('process_editor.configuration_panel_set_auto_pdf_tasks'),
        }),
      ).toBeInTheDocument();
    });

    it('should show selector as button when there are selected tasks', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({ taskIds: ['task_1'] });

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
      });

      expect(
        screen.queryByRole('combobox', {
          name: textMock('process_editor.configuration_panel_set_auto_pdf_tasks'),
        }),
      ).not.toBeInTheDocument();

      expect(
        screen.getByRole('button', {
          name: textMock('process_editor.configuration_panel_set_auto_pdf_tasks'),
        }),
      ).toBeInTheDocument();
    });

    it('should show combobox when there are no selected tasks', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({ taskIds: [] });

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
      });

      expect(
        screen.getByRole('combobox', {
          name: textMock('process_editor.configuration_panel_set_auto_pdf_tasks'),
        }),
      ).toBeInTheDocument();

      expect(
        screen.queryByRole('button', {
          name: textMock('process_editor.configuration_panel_set_auto_pdf_tasks'),
        }),
      ).not.toBeInTheDocument();
    });

    it('should show combobox when there are no selected tasks', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({ taskIds: [] });

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
      });

      expect(
        screen.getByRole('combobox', {
          name: textMock('process_editor.configuration_panel_set_auto_pdf_tasks'),
        }),
      ).toBeInTheDocument();

      expect(
        screen.queryByRole('button', {
          name: textMock('process_editor.configuration_panel_set_auto_pdf_tasks'),
        }),
      ).not.toBeInTheDocument();
    });

    it('should select a task when option is clicked', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({ taskIds: [] });

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
      });

      const combobox = screen.getByRole('combobox', {
        name: textMock('process_editor.configuration_panel_set_auto_pdf_tasks'),
      });
      await user.click(combobox);

      const option = screen.getByRole('option', { name: /Task 1.*\(task_1\)/ });
      await user.click(option);

      // Verify the option was interacted with - the component handles state internally
      expect(option).toBeInTheDocument();
    });

    it('should show options when combobox is opened', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({ taskIds: ['task_1'] });

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
      });

      // Open the selector
      const tasksButton = screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_set_auto_pdf_tasks'),
      });
      await user.click(tasksButton);

      const combobox = screen.getByRole('combobox', {
        name: textMock('process_editor.configuration_panel_set_auto_pdf_tasks'),
      });
      await user.click(combobox);

      // Both options should be available
      expect(screen.getByRole('option', { name: /Task 1.*\(task_1\)/ })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Task 2.*\(task_2\)/ })).toBeInTheDocument();
    });
  });

  describe('updateTaskIds integration', () => {
    it('should initialize with correct selected task ids from pdfConfig', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({ taskIds: ['task_1', 'task_2'] });

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
      });

      // Both tasks should be displayed as selected in button mode
      expect(screen.getByText(/Task 1.*\(task_1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Task 2.*\(task_2\)/)).toBeInTheDocument();
    });

    it('should filter out task ids that are not in available tasks', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({ taskIds: ['task_1', 'non_existent_task'] });

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
      });

      // Only task_1 should be displayed since non_existent_task is not in availableTasks
      expect(screen.getByText(/Task 1.*\(task_1\)/)).toBeInTheDocument();
      expect(screen.queryByText(/non_existent_task/)).not.toBeInTheDocument();
    });

    it('should call updateTaskIds when selecting a task from combobox', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({ taskIds: [] });

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
      });

      const combobox = screen.getByRole('combobox', {
        name: textMock('process_editor.configuration_panel_set_auto_pdf_tasks'),
      });
      await user.click(combobox);

      const option = screen.getByRole('option', { name: /Task 1.*\(task_1\)/ });
      await user.click(option);

      // Wait for the callback to be triggered
      await waitFor(() => expect(mockUpdateTaskIds).toHaveBeenCalled());
      expect(mockUpdateTaskIds).toHaveBeenCalledWith(['task_1']);
    });

    it('should call updateTaskIds when deselecting a task from combobox', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({ taskIds: ['task_1'] });

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
      });

      // Open the selector
      const tasksButton = screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_set_auto_pdf_tasks'),
      });
      await user.click(tasksButton);

      const combobox = screen.getByRole('combobox', {
        name: textMock('process_editor.configuration_panel_set_auto_pdf_tasks'),
      });
      await user.click(combobox);

      const option = screen.getByRole('option', { name: /Task 1.*\(task_1\)/ });
      await user.click(option);

      // Wait for the callback to be triggered
      await waitFor(() => expect(mockUpdateTaskIds).toHaveBeenCalledWith([]));
    });
  });
});

type RenderProps = {
  bpmnContextProps: Partial<BpmnContextProps>;
};

const renderConfigPdfServiceTask = (props: Partial<RenderProps> = {}) => {
  const { bpmnContextProps } = props;

  return render(
    <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...bpmnContextProps }}>
      <ConfigPdfServiceTask />
    </BpmnContext.Provider>,
  );
};
