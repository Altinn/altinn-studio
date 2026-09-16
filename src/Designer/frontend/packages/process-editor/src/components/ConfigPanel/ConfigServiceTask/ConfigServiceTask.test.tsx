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

  it('should warn that eFormidling must be configured in process.bpmn', () => {
    renderConfigServiceTask({
      bpmnContextProps: { bpmnDetails: { ...mockBpmnDetails, taskType: 'eFormidling' } },
    });

    expect(
      screen.getByText(
        textMock('process_editor.configuration_panel_eformidling_incomplete_config_alert'),
      ),
    ).toBeInTheDocument();
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
