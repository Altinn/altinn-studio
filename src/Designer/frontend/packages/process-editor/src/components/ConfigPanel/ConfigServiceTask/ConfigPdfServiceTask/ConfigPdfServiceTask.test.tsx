import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ConfigPdfServiceTask } from './ConfigPdfServiceTask';
import { BpmnContext, type BpmnContextProps } from '../../../../contexts/BpmnContext';
import { mockBpmnContextValue } from '../../../../../test/mocks/bpmnContextMock';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';
import type { BpmnDetails } from '../../../../types/BpmnDetails';

let mockTasks: any[] = [];

jest.mock('../../../../utils/bpmnModeler/StudioModeler', () => {
  return {
    StudioModeler: jest.fn().mockImplementation(() => {
      return {
        getAllTasksByType: jest.fn(() => mockTasks),
      };
    }),
  };
});

const mockUpdateTaskIds = jest.fn();
jest.mock('../../../../hooks/useUpdatePdfConfigTaskIds', () => ({
  useUpdatePdfConfigTaskIds: () => mockUpdateTaskIds,
}));

describe('ConfigPdfServiceTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTasks = [
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

  describe('changing filename', () => {
    it('should call modeling.updateModdleProperties when filename is changed', async () => {
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

      const input = screen.getByLabelText(
        textMock('process_editor.configuration_panel_change_pdf_service_task_filename'),
      );

      await user.clear(input);
      await user.type(input, 'test.pdf');
      await user.tab();

      expect(mockUpdateModdleProperties).not.toHaveBeenCalled();
    });

    it('should create null filenameElement when filename is cleared', async () => {
      const user = userEvent.setup();
      const mockUpdateModdleProperties = jest.fn();
      const mockCreate = jest.fn((type, props) => ({
        $type: type,
        ...props,
      }));

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

      const input = screen.getByLabelText(
        textMock('process_editor.configuration_panel_change_pdf_service_task_filename'),
      );

      await user.clear(input);
      await user.tab();

      expect(mockUpdateModdleProperties).toHaveBeenCalledWith(
        pdfBpmnDetails.element,
        expect.anything(),
        expect.objectContaining({
          filename: null,
        }),
      );
    });
  });

  describe('selecting and deselecting tasks', () => {
    it('should call updateTaskIds when selecting a task', async () => {
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

      await waitFor(() => expect(mockUpdateTaskIds).toHaveBeenCalled());
      expect(mockUpdateTaskIds).toHaveBeenCalledWith(['task_1']);
    });

    it('should call updateTaskIds when deselecting a task', async () => {
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
      await user.click(combobox);

      const option = screen.getByRole('option', { name: /Task 1.*\(task_1\)/ });
      await user.click(option);

      await waitFor(() => expect(mockUpdateTaskIds).toHaveBeenCalledWith([]));
    });

    it('should hide task selector when close button is clicked', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({ taskIds: [] });

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

      expect(screen.getByRole('option', { name: /\(task_1\)/ })).toBeInTheDocument();
    });

    it('should handle pdfConfig without autoPdfTaskIds', () => {
      const pdfBpmnDetails: BpmnDetails = {
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
                    filename: { value: 'test.pdf' },
                  },
                },
              ],
            },
          },
        },
      };

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
    });

    it('should handle pdfConfig with null autoPdfTaskIds.taskIds', () => {
      const pdfBpmnDetails: BpmnDetails = {
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
                    filename: { value: 'test.pdf' },
                    autoPdfTaskIds: {
                      taskIds: null,
                    },
                  },
                },
              ],
            },
          },
        },
      };

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
    });

    it('should show combobox when selectedTasks is empty after filtering', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({ taskIds: ['non_existent_task'] });

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
    });

    it('should use empty array fallback when availableTasks is null', () => {
      mockTasks = [];

      const pdfBpmnDetails = createPdfBpmnDetails({ taskIds: ['task_1'] });

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
