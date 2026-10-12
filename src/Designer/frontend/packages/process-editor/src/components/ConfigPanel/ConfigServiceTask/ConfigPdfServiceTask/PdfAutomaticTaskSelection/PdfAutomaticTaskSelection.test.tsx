import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { PdfAutomaticTaskSelection } from './PdfAutomaticTaskSelection';
import { createBpmnTestModeler } from '../../../../../../test/createBpmnTestModeler';

let mockTasks: any[] = [];

const defaultMockTasks = [
  {
    id: 'task_1',
    businessObject: {
      name: 'Task 1',
      extensionElements: {
        values: [{ $type: 'altinn:TaskExtension', taskType: 'data' }],
      },
    },
  },
  {
    id: 'task_2',
    businessObject: {
      name: 'Task 2',
      extensionElements: {
        values: [{ $type: 'altinn:TaskExtension', taskType: 'data' }],
      },
    },
  },
];

vi.mock('../../../../../utils/bpmnModeler/StudioModeler', () => ({
  StudioModeler: vi.fn().mockImplementation(function () {
    return {
      getElementsByType: () => mockTasks,
    };
  }),
}));

describe('PdfAutomaticTaskSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    expect(
      screen.getByRole('option', { name: /Task 1.*\(task_1\)/, hidden: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /Task 2.*\(task_2\)/, hidden: true }),
    ).toBeInTheDocument();
  });

  it('persists a selected task', async () => {
    const user = userEvent.setup();

    const { saveXml } = renderPdfAutomaticTaskSelection();

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    const option = screen.getByRole('option', { name: /Task 1.*\(task_1\)/, hidden: true });
    await user.click(option);

    expect(await saveXml()).toContain('<altinn:taskId>task_1</altinn:taskId>');
  });

  it('removes a deselected task from the BPMN', async () => {
    const user = userEvent.setup();

    const { saveXml } = renderPdfAutomaticTaskSelection(['task_1']);

    await user.click(screen.getByRole('combobox'));

    const selectedTaskChip = screen.getByRole('option', {
      name: /^Task 1 \(task_1\), /,
      hidden: true,
    });
    await user.click(selectedTaskChip);

    expect(await saveXml()).not.toContain('<altinn:taskId>');
  });

  it('persists multiple selected tasks', async () => {
    const user = userEvent.setup();

    const { saveXml } = renderPdfAutomaticTaskSelection();

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    await user.click(screen.getByRole('option', { name: /Task 1.*\(task_1\)/, hidden: true }));
    expect(await saveXml()).toContain('<altinn:taskId>task_1</altinn:taskId>');

    await user.click(screen.getByRole('option', { name: /Task 2.*\(task_2\)/, hidden: true }));
    const xml = await saveXml();
    expect(xml).toContain('<altinn:taskId>task_1</altinn:taskId>');
    expect(xml).toContain('<altinn:taskId>task_2</altinn:taskId>');
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
              values: [{ $type: 'altinn:TaskExtension', taskType: 'data' }],
            },
          },
        },
      ];

      renderPdfAutomaticTaskSelection();

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);

      expect(screen.getByRole('option', { name: /\(task_1\)/, hidden: true })).toBeInTheDocument();
    });

    it('should handle tasks with undefined businessObject name', async () => {
      const user = userEvent.setup();
      mockTasks = [
        {
          id: 'task_1',
          businessObject: {
            extensionElements: {
              values: [{ $type: 'altinn:TaskExtension', taskType: 'data' }],
            },
          },
        },
      ];

      renderPdfAutomaticTaskSelection();

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);

      expect(screen.getByRole('option', { name: /\(task_1\)/, hidden: true })).toBeInTheDocument();
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
  const modeler = createBpmnTestModeler();
  const pdfConfig = modeler.moddle.create('altinn:PdfConfig', {
    autoPdfTaskIds: modeler.moddle.create('altinn:AutoPdfTaskIds', {
      taskIds: taskIds.map((value) => modeler.moddle.create('altinn:TaskId', { value })),
    }),
  });
  modeler.businessObject.extensionElements = modeler.moddle.create('bpmn:ExtensionElements', {
    values: [modeler.moddle.create('altinn:TaskExtension', { taskType: 'pdf', pdfConfig })],
  });
  render(<PdfAutomaticTaskSelection />, { wrapper: modeler.Wrapper });
  return modeler;
};
