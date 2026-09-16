import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ConfigServiceTask } from './ConfigServiceTask';
import { type BpmnContextProps } from '../../../contexts/BpmnContext';
import { type BpmnApiContextProps } from '../../../contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from '../../../contexts/BpmnConfigPanelContext';
import { mockBpmnDetails } from '../../../../test/mocks/bpmnDetailsMock';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { createPdfBpmnDetails } from './ConfigPdfServiceTask/testUtils';

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

  // The type field is what decides which panel is shown, so unmounting it on the value just typed
  // would leave the developer in a panel with no way back to the type they came from.
  it.each(['', 'myServiceTask', 'eFormidling', 'fiksArkiv', 'pdf', 'subformPdf'])(
    'should offer an editable task type for "%s"',
    (taskType) => {
      renderConfigServiceTask({
        bpmnContextProps: { bpmnDetails: { ...mockBpmnDetails, taskType } },
        bpmnApiContextProps: { layoutSets: [] },
      });

      expect(queryTaskTypeField()).toBeInTheDocument();
    },
  );

  it('should render eFormidling configuration for an eFormidling service task', () => {
    renderConfigServiceTask({
      bpmnContextProps: { bpmnDetails: { ...mockBpmnDetails, taskType: 'eFormidling' } },
    });

    expect(queryEFormidlingField()).toBeInTheDocument();
  });

  // fiksArkiv takes no BPMN configuration at all - `FiksArkivSettings` comes from appsettings - so
  // it has no fields here, only the warning about the shape it sits in.
  it.each(['fiksArkiv', 'myServiceTask'])(
    'should render no eFormidling configuration for %s',
    (taskType) => {
      renderConfigServiceTask({
        bpmnContextProps: { bpmnDetails: { ...mockBpmnDetails, taskType } },
      });

      expect(queryEFormidlingField()).not.toBeInTheDocument();
    },
  );

  // The runtime refuses to start a fiksArkiv task that is not followed by an exclusive gateway, and
  // the palette creates the task without one. No other task type has that rule.
  it('should warn about the process shape of a fiksArkiv task with nothing after it', () => {
    renderConfigServiceTask({
      bpmnContextProps: { bpmnDetails: { ...mockBpmnDetails, taskType: 'fiksArkiv' } },
    });

    expect(queryProcessShapeWarning()).toBeInTheDocument();
  });

  it.each(['eFormidling', 'myServiceTask'])(
    'should render no process shape warning for %s',
    (taskType) => {
      renderConfigServiceTask({
        bpmnContextProps: { bpmnDetails: { ...mockBpmnDetails, taskType } },
      });

      expect(queryProcessShapeWarning()).not.toBeInTheDocument();
    },
  );

  it('should render subform pdf configuration for a subformPdf task', () => {
    renderConfigServiceTask({
      bpmnContextProps: { bpmnDetails: { ...mockBpmnDetails, taskType: 'subformPdf' } },
    });

    expect(
      screen.getByLabelText(
        textMock('process_editor.configuration_panel_subform_pdf_component_id_label'),
      ),
    ).toBeInTheDocument();
  });

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

const queryEFormidlingField = (): HTMLElement | null =>
  screen.queryByRole('button', {
    name: textMock('process_editor.configuration_panel.eformidling.type_label'),
  });

const queryProcessShapeWarning = (): HTMLElement | null =>
  screen.queryByText(
    textMock('process_editor.configuration_panel.fiks_arkiv.missing_gateway_alert'),
  );

type RenderProps = {
  bpmnContextProps: Partial<BpmnContextProps>;
  bpmnApiContextProps?: Partial<BpmnApiContextProps>;
};

const renderConfigServiceTask = (props: Partial<RenderProps> = {}) =>
  renderWithProviders(
    <BpmnConfigPanelFormContextProvider>
      <ConfigServiceTask />
    </BpmnConfigPanelFormContextProvider>,
    props,
  );
