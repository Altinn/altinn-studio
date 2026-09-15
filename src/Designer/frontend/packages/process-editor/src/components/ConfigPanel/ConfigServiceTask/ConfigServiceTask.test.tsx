import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ConfigServiceTask } from './ConfigServiceTask';
import { BpmnContext, type BpmnContextProps } from '../../../contexts/BpmnContext';
import { BpmnApiContext, type BpmnApiContextProps } from '../../../contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from '../../../contexts/BpmnConfigPanelContext';
import {
  mockBpmnContextValue,
  mockBpmnApiContextValue,
} from '../../../../test/mocks/bpmnContextMock';
import { mockBpmnDetails } from '../../../../test/mocks/bpmnDetailsMock';
import type { BpmnDetails } from '../../../types/BpmnDetails';
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
        getElementsByType: jest.fn().mockReturnValue(tasks),
        getAllElementIds: jest.fn().mockReturnValue(tasks.map((task) => task.id)),
      };
    }),
  };
});

jest.mock('app-shared/hooks/useStudioEnvironmentParams', () => ({
  useStudioEnvironmentParams: () => ({ org: 'test-org', app: 'test-app' }),
}));

jest.mock('app-shared/hooks/queries', () => ({
  useTextResourcesQuery: () => ({ data: { nb: [] } }),
}));

jest.mock('app-shared/hooks/mutations', () => ({
  useUpsertTextResourceMutation: () => ({ mutate: jest.fn() }),
}));

jest.mock('../../../hooks/useUpdatePdfConfigTaskIds', () => ({
  useUpdatePdfConfigTaskIds: () => jest.fn(),
}));

describe('ConfigServiceTask', () => {
  afterEach(() => jest.clearAllMocks());

  it('should render EditTaskId component', () => {
    renderConfigServiceTask();

    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_change_task_id'),
      }),
    ).toBeInTheDocument();
  });

  it('should render an editable task name field', () => {
    renderConfigServiceTask();

    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_name_label'),
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(mockBpmnDetails.name)).toBeInTheDocument();
  });

  it('should not render pdf configuration for non-pdf service task', () => {
    renderConfigServiceTask();

    expect(
      screen.queryByRole('button', {
        name: textMock('process_editor.configuration_panel_pdf_filename_label'),
      }),
    ).not.toBeInTheDocument();
  });

  it('should not offer an editable task type for pdf, which has a panel of its own', () => {
    const pdfBpmnDetails = createPdfBpmnDetails({});

    renderConfigServiceTask({
      bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
      bpmnApiContextProps: { layoutSets: [] },
    });

    expect(queryTaskTypeField()).not.toBeInTheDocument();
  });

  // Studio has no panel for these yet, so the type field stays — otherwise typing one of these
  // names into it would unmount the only control the task has, with no way back.
  it.each(['', 'myServiceTask', 'eFormidling', 'subformPdf', 'fiksArkiv'])(
    'should offer an editable task type for "%s"',
    (taskType) => {
      renderConfigServiceTask({
        bpmnContextProps: { bpmnDetails: { ...mockBpmnDetails, taskType } },
      });

      expect(queryTaskTypeField()).toBeInTheDocument();
    },
  );

  it.each([
    ['eFormidling', 'process_editor.configuration_panel_eformidling_incomplete_config_alert'],
    ['subformPdf', 'process_editor.configuration_panel_subform_pdf_incomplete_config_alert'],
  ])('should warn that %s must be configured in process.bpmn', (taskType, alertKey) => {
    renderConfigServiceTask({
      bpmnContextProps: { bpmnDetails: { ...mockBpmnDetails, taskType } },
    });

    expect(screen.getByText(textMock(alertKey))).toBeInTheDocument();
  });

  it.each(['fiksArkiv', 'myServiceTask'])(
    'should show no incomplete configuration warning for %s',
    (taskType) => {
      renderConfigServiceTask({
        bpmnContextProps: { bpmnDetails: { ...mockBpmnDetails, taskType } },
      });

      expect(
        screen.queryByText(
          textMock('process_editor.configuration_panel_eformidling_incomplete_config_alert'),
        ),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(
          textMock('process_editor.configuration_panel_subform_pdf_incomplete_config_alert'),
        ),
      ).not.toBeInTheDocument();
    },
  );

  it('should render pdf configuration for pdf service task', () => {
    const pdfBpmnDetails = createPdfBpmnDetails({});

    renderConfigServiceTask({
      bpmnContextProps: {
        bpmnDetails: pdfBpmnDetails,
      },
      bpmnApiContextProps: {
        layoutSets: [],
      },
    });

    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_pdf_filename_label'),
      }),
    ).toBeInTheDocument();
  });
});

const queryTaskTypeField = (): HTMLElement | null =>
  screen.queryByRole('button', {
    name: textMock('process_editor.configuration_panel_service_task_type_label'),
  });

type RenderProps = {
  bpmnContextProps: Partial<BpmnContextProps>;
  bpmnApiContextProps?: Partial<BpmnApiContextProps>;
};

const renderConfigServiceTask = (props: Partial<RenderProps> = {}) => {
  const { bpmnContextProps, bpmnApiContextProps } = props;

  return render(
    <MemoryRouter>
      <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextProps }}>
        <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...bpmnContextProps }}>
          <BpmnConfigPanelFormContextProvider>
            <ConfigServiceTask />
          </BpmnConfigPanelFormContextProvider>
        </BpmnContext.Provider>
      </BpmnApiContext.Provider>
    </MemoryRouter>,
  );
};
