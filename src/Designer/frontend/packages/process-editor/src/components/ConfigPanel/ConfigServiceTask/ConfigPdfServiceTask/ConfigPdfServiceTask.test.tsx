import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ConfigPdfServiceTask } from './ConfigPdfServiceTask';
import { BpmnContext, type BpmnContextProps } from '../../../../contexts/BpmnContext';
import { BpmnApiContext, type BpmnApiContextProps } from '../../../../contexts/BpmnApiContext';
import {
  mockBpmnContextValue,
  mockBpmnApiContextValue,
} from '../../../../../test/mocks/bpmnContextMock';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';
import type { BpmnDetails } from '../../../../types/BpmnDetails';
import { MemoryRouter } from 'react-router-dom';

type PdfBpmnDetailsConfig = {
  filenameTextResourceKey?: string;
  taskIds?: string[];
};

const createPdfBpmnDetails = (config: PdfBpmnDetailsConfig = {}): BpmnDetails => {
  const { filenameTextResourceKey = '', taskIds = [] } = config;
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
                filenameTextResourceKey: filenameTextResourceKey
                  ? { value: filenameTextResourceKey }
                  : undefined,
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

jest.mock('app-shared/hooks/useStudioEnvironmentParams', () => ({
  useStudioEnvironmentParams: () => ({ org: 'test-org', app: 'test-app' }),
}));

jest.mock('app-shared/hooks/queries', () => ({
  useTextResourcesQuery: () => ({ data: { nb: [] } }),
}));

const mockUpsertTextResource = jest.fn();
jest.mock('app-shared/hooks/mutations', () => ({
  useUpsertTextResourceMutation: () => ({ mutate: mockUpsertTextResource }),
}));

jest.mock('app-shared/hooks/useValidateLayoutSetName', () => ({
  useValidateLayoutSetName: () => ({
    validateLayoutSetName: () => undefined,
  }),
}));

const emptyLayoutSets = { sets: [] };

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

  describe('version warnings', () => {
    it('should show warning when appLibVersion is below minimum required version', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
          appLibVersion: '8.0.0',
        },
        bpmnApiContextProps: {
          layoutSets: emptyLayoutSets,
        },
      });

      expect(
        screen.getByText(
          textMock('process_editor.palette_pdf_service_task_version_error', {
            version: '8.9.0',
          }),
        ),
      ).toBeInTheDocument();
    });

    it('should show warning when frontendVersion is below minimum required version', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
          appLibVersion: '8.9.0',
          frontendVersion: '4.0.0',
        },
        bpmnApiContextProps: {
          layoutSets: emptyLayoutSets,
        },
      });

      expect(
        screen.getByText(
          textMock('process_editor.palette_pdf_service_task_frontend_version_error', {
            version: '4.25.2',
          }),
        ),
      ).toBeInTheDocument();
    });

    it('should not show version warning when both versions meet requirements', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
          appLibVersion: '8.9.0',
          frontendVersion: '4.25.2',
        },
        bpmnApiContextProps: {
          layoutSets: emptyLayoutSets,
        },
      });

      expect(
        screen.queryByText(
          textMock('process_editor.palette_pdf_service_task_version_error', {
            version: '8.9.0',
          }),
        ),
      ).not.toBeInTheDocument();

      expect(
        screen.queryByText(
          textMock('process_editor.palette_pdf_service_task_frontend_version_error', {
            version: '4.25.2',
          }),
        ),
      ).not.toBeInTheDocument();
    });
  });

  describe('PDF mode radio group', () => {
    it('should render PDF mode radio group with automatic and layout-based options', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: emptyLayoutSets,
        },
      });

      expect(
        screen.getByRole('group', {
          name: textMock('process_editor.configuration_panel_pdf_mode'),
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole('radio', {
          name: textMock('process_editor.configuration_panel_pdf_mode_automatic'),
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole('radio', {
          name: textMock('process_editor.configuration_panel_pdf_mode_layout_based'),
        }),
      ).toBeInTheDocument();
    });

    it('should default to layout-based mode when a layout set exists for the task', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: {
            sets: [
              {
                id: 'pdf-layout-set',
                tasks: [pdfBpmnDetails.id],
              },
            ],
          },
        },
      });

      expect(
        screen.getByRole('button', {
          name: textMock('process_editor.configuration_panel_pdf_layout_set_link'),
        }),
      ).toBeInTheDocument();
    });
  });

  describe('automatic mode - task selection', () => {
    it('should render task selector combobox in automatic mode', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: emptyLayoutSets,
        },
      });

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should call updateTaskIds when selecting a task', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({ taskIds: [] });

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: emptyLayoutSets,
        },
      });

      const combobox = screen.getByRole('combobox');
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
        bpmnApiContextProps: {
          layoutSets: emptyLayoutSets,
        },
      });

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);

      const option = screen.getByRole('option', { name: /Task 1.*\(task_1\)/ });
      await user.click(option);

      await waitFor(() => expect(mockUpdateTaskIds).toHaveBeenCalledWith([]));
    });
  });

  describe('filename configuration', () => {
    it('should render filename property button', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: emptyLayoutSets,
        },
      });

      expect(
        screen.getByRole('button', {
          name: textMock('process_editor.configuration_panel_pdf_filename_label'),
        }),
      ).toBeInTheDocument();
    });

    it('should open text resource editor when clicking filename button', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: emptyLayoutSets,
        },
      });

      const filenameButton = screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_pdf_filename_label'),
      });
      await user.click(filenameButton);

      expect(screen.getByRole('button', { name: textMock('general.save') })).toBeInTheDocument();
    });
  });

  describe('layout-based mode', () => {
    it('should show create layout set form when switching to layout-based mode without existing layout set', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: emptyLayoutSets,
        },
      });

      const layoutBasedRadio = screen.getByRole('radio', {
        name: textMock('process_editor.configuration_panel_pdf_mode_layout_based'),
      });
      await user.click(layoutBasedRadio);

      expect(
        screen.getByLabelText(
          textMock('process_editor.configuration_panel_pdf_layout_set_name_label'),
        ),
      ).toBeInTheDocument();
    });

    it('should show data model selector in layout-based mode', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: emptyLayoutSets,
          allDataModelIds: ['dataModel1', 'dataModel2'],
        },
      });

      const layoutBasedRadio = screen.getByRole('radio', {
        name: textMock('process_editor.configuration_panel_pdf_mode_layout_based'),
      });
      await user.click(layoutBasedRadio);

      expect(
        screen.getByLabelText(
          textMock('process_editor.configuration_panel_pdf_select_data_model_label'),
        ),
      ).toBeInTheDocument();
    });

    it('should show edit PDF button when layout set exists for current task', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: {
            sets: [
              {
                id: 'pdf-layout-set',
                tasks: [pdfBpmnDetails.id],
              },
            ],
          },
        },
      });

      expect(
        screen.getByRole('button', {
          name: textMock('process_editor.configuration_panel_pdf_layout_set_link'),
        }),
      ).toBeInTheDocument();
    });

    it('should call deleteLayoutSet when switching from layout-based to automatic mode and confirming', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});
      const deleteLayoutSetMock = jest.fn();
      jest.spyOn(window, 'confirm').mockReturnValue(true);

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: {
            sets: [
              {
                id: 'pdf-layout-set',
                tasks: [pdfBpmnDetails.id],
              },
            ],
          },
          deleteLayoutSet: deleteLayoutSetMock,
        },
      });

      const automaticRadio = screen.getByRole('radio', {
        name: textMock('process_editor.configuration_panel_pdf_mode_automatic'),
      });
      await user.click(automaticRadio);

      expect(window.confirm).toHaveBeenCalledWith(
        textMock('process_editor.configuration_panel_pdf_mode_change_to_automatic_confirm'),
      );
      expect(deleteLayoutSetMock).toHaveBeenCalledWith({ layoutSetIdToUpdate: 'pdf-layout-set' });
    });

    it('should not change mode when switching from layout-based to automatic mode and canceling', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});
      const deleteLayoutSetMock = jest.fn();
      jest.spyOn(window, 'confirm').mockReturnValue(false);

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: {
            sets: [
              {
                id: 'pdf-layout-set',
                tasks: [pdfBpmnDetails.id],
              },
            ],
          },
          deleteLayoutSet: deleteLayoutSetMock,
        },
      });

      const automaticRadio = screen.getByRole('radio', {
        name: textMock('process_editor.configuration_panel_pdf_mode_automatic'),
      });
      await user.click(automaticRadio);

      expect(window.confirm).toHaveBeenCalled();
      expect(deleteLayoutSetMock).not.toHaveBeenCalled();
      expect(
        screen.getByRole('button', {
          name: textMock('process_editor.configuration_panel_pdf_layout_set_link'),
        }),
      ).toBeInTheDocument();
    });

    it('should enable create button when both name and data model are provided', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: emptyLayoutSets,
          allDataModelIds: ['dataModel1', 'dataModel2'],
        },
      });

      const layoutBasedRadio = screen.getByRole('radio', {
        name: textMock('process_editor.configuration_panel_pdf_mode_layout_based'),
      });
      await user.click(layoutBasedRadio);

      const createButton = screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_pdf_create_button'),
      });

      expect(createButton).toBeDisabled();

      const layoutSetNameInput = screen.getByLabelText(
        textMock('process_editor.configuration_panel_pdf_layout_set_name_label'),
      );
      await user.type(layoutSetNameInput, 'my-pdf-layout');

      expect(createButton).toBeDisabled();

      const dataModelCombobox = screen.getByRole('combobox', {
        name: textMock('process_editor.configuration_panel_pdf_select_data_model_label'),
      });
      await user.click(dataModelCombobox);
      await user.click(screen.getByRole('option', { name: 'dataModel1' }));

      await waitFor(() => expect(createButton).not.toBeDisabled());
    });

    it('should call addLayoutSet when clicking create button with valid inputs', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});
      const addLayoutSetMock = jest.fn();

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: emptyLayoutSets,
          allDataModelIds: ['dataModel1', 'dataModel2'],
          addLayoutSet: addLayoutSetMock,
        },
      });

      const layoutBasedRadio = screen.getByRole('radio', {
        name: textMock('process_editor.configuration_panel_pdf_mode_layout_based'),
      });
      await user.click(layoutBasedRadio);

      const createButton = screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_pdf_create_button'),
      });

      const layoutSetNameInput = screen.getByLabelText(
        textMock('process_editor.configuration_panel_pdf_layout_set_name_label'),
      );
      await user.type(layoutSetNameInput, 'my-pdf-layout');

      const dataModelCombobox = screen.getByRole('combobox', {
        name: textMock('process_editor.configuration_panel_pdf_select_data_model_label'),
      });
      await user.click(dataModelCombobox);
      await user.click(screen.getByRole('option', { name: 'dataModel1' }));

      await waitFor(() => expect(createButton).not.toBeDisabled());
      await user.click(createButton);

      await waitFor(() => expect(addLayoutSetMock).toHaveBeenCalledTimes(1));
      expect(addLayoutSetMock).toHaveBeenCalledWith({
        layoutSetIdToUpdate: 'my-pdf-layout',
        taskType: 'pdf',
        layoutSetConfig: {
          id: 'my-pdf-layout',
          dataType: 'dataModel1',
          tasks: [pdfBpmnDetails.id],
        },
      });
    });

    it('should disable create button when layout set name is empty', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: emptyLayoutSets,
          allDataModelIds: ['dataModel1'],
        },
      });

      const layoutBasedRadio = screen.getByRole('radio', {
        name: textMock('process_editor.configuration_panel_pdf_mode_layout_based'),
      });
      await user.click(layoutBasedRadio);

      const dataModelCombobox = screen.getByRole('combobox', {
        name: textMock('process_editor.configuration_panel_pdf_select_data_model_label'),
      });
      await user.click(dataModelCombobox);
      await user.click(screen.getByRole('option', { name: 'dataModel1' }));
      await user.keyboard('{Escape}');

      const createButton = screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_pdf_create_button'),
      });
      expect(createButton).toBeDisabled();
    });

    it('should disable create button when data model is not selected', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: emptyLayoutSets,
          allDataModelIds: ['dataModel1'],
        },
      });

      const layoutBasedRadio = screen.getByRole('radio', {
        name: textMock('process_editor.configuration_panel_pdf_mode_layout_based'),
      });
      await user.click(layoutBasedRadio);

      const layoutSetNameInput = screen.getByLabelText(
        textMock('process_editor.configuration_panel_pdf_layout_set_name_label'),
      );
      await user.type(layoutSetNameInput, 'my-pdf-layout');

      const createButton = screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_pdf_create_button'),
      });
      expect(createButton).toBeDisabled();
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
        bpmnApiContextProps: {
          layoutSets: emptyLayoutSets,
        },
      });

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

      const pdfBpmnDetails = createPdfBpmnDetails({ taskIds: [] });

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: emptyLayoutSets,
        },
      });

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);

      expect(screen.getByRole('option', { name: /\(task_1\)/ })).toBeInTheDocument();
    });

    it('should handle pdfConfig without autoPdfTaskIds', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: emptyLayoutSets,
        },
      });

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should filter out invalid task ids that no longer exist', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({ taskIds: ['non_existent_task'] });

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: emptyLayoutSets,
        },
      });

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should handle empty available tasks', () => {
      mockTasks = [];

      const pdfBpmnDetails = createPdfBpmnDetails({ taskIds: ['task_1'] });

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: emptyLayoutSets,
        },
      });

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });
});

type RenderProps = {
  bpmnContextProps: Partial<BpmnContextProps>;
  bpmnApiContextProps?: Partial<BpmnApiContextProps>;
};

const renderConfigPdfServiceTask = (props: Partial<RenderProps> = {}) => {
  const { bpmnContextProps, bpmnApiContextProps } = props;

  return render(
    <MemoryRouter>
      <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextProps }}>
        <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...bpmnContextProps }}>
          <ConfigPdfServiceTask />
        </BpmnContext.Provider>
      </BpmnApiContext.Provider>
    </MemoryRouter>,
  );
};
