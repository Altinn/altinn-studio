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
import { createPdfBpmnDetails } from '../../../../../test/mocks/pdfBpmnDetailsMock';
import { MemoryRouter } from 'react-router-dom';

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
