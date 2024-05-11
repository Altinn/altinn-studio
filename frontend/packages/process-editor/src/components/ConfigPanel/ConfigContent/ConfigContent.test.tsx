import React from 'react';
import { ConfigContent } from './ConfigContent';
import { render, screen } from '@testing-library/react';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import type { BpmnContextProps } from '../../../contexts/BpmnContext';
import { BpmnContext } from '../../../contexts/BpmnContext';
import userEvent from '@testing-library/user-event';
import type { BpmnDetails } from '../../../types/BpmnDetails';
import { BpmnTypeEnum } from '../../../enum/BpmnTypeEnum';
import type Modeler from 'bpmn-js/lib/Modeler';
import { type BpmnTaskType } from '../../../types/BpmnTaskType';
import { BpmnConfigPanelFormContextProvider } from '../../../contexts/BpmnConfigPanelContext';
import { BpmnApiContext } from '../../../contexts/BpmnApiContext';
import type { BpmnApiContextProps } from '../../../contexts/BpmnApiContext';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;
const mockAppLibVersion8: string = '8.0.3';

const mockTaskId: string = 'testId';
const mockName: string = 'testName';
const layoutSetIdToUpdate: string = 'layoutSet1';

const modelerRefMock = {
  current: {
    get: () => {},
  } as unknown as Modeler,
};

const mockBpmnDetails: BpmnDetails = {
  id: mockTaskId,
  name: mockName,
  taskType: 'data',
  type: BpmnTypeEnum.Task,
};

const mockBpmnApiContextValue: Partial<BpmnApiContextProps> = {
  layoutSets: { sets: [] },
  availableDataModelIds: [],
};

const mockBpmnContextValue: BpmnContextProps = {
  bpmnXml: mockBPMNXML,
  appLibVersion: mockAppLibVersion8,
  getUpdatedXml: jest.fn(),
  isEditAllowed: true,
  bpmnDetails: mockBpmnDetails,
  setBpmnDetails: jest.fn(),
  modelerRef: modelerRefMock,
};

jest.mock('../../../hooks/useBpmnModeler', () => ({
  useBpmnModeler: () => ({
    getModeler: () => ({
      get: () => ({
        updateProperties: jest.fn(),
      }),
    }),
  }),
}));

describe('ConfigContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render heading for selected task', () => {
    renderConfigContent();
    expect(
      screen.getByRole('heading', {
        name: textMock('process_editor.configuration_panel_data_task'),
        level: 2,
      }),
    ).toBeInTheDocument();
  });

  it('should render helpText for selected task', async () => {
    const user = userEvent.setup();
    renderConfigContent();

    const helpTextButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_header_help_text_title'),
    });
    user.click(helpTextButton);
    const helpText = await screen.findByText(
      textMock('process_editor.configuration_panel_header_help_text_data'),
    );
    expect(helpText).toBeInTheDocument();
  });

  it('should render EditTaskId component', () => {
    renderConfigContent();

    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_change_task_id'),
      }),
    ).toBeInTheDocument();
  });

  it.each(['data', 'confirmation', 'feedback', 'signing'])(
    'should render correct header config for each taskType',
    (taskType) => {
      renderConfigContent(
        {},
        {
          bpmnDetails: { ...mockBpmnDetails, taskType: taskType as BpmnTaskType },
        },
      );
      screen.getByRole('heading', {
        name: textMock(`process_editor.configuration_panel_${taskType}_task`),
        level: 2,
      });
      expect(screen.getByText(mockBpmnDetails.id)).toBeInTheDocument();
      expect(screen.getByText(mockBpmnDetails.name)).toBeInTheDocument();
    },
  );

  it.each(['confirmation', 'feedback', 'signing'])(
    'should not render data type selector for task type %s',
    (taskType) => {
      renderConfigContent(
        {},
        {
          bpmnDetails: { ...mockBpmnDetails, taskType: taskType as BpmnTaskType },
        },
      );
      expect(
        screen.queryByRole('button', {
          name: textMock('process_editor.configuration_panel_set_datamodel_link'),
        }),
      ).not.toBeInTheDocument();
    },
  );

  it('should render data type selector for task type data', () => {
    renderConfigContent();
    expect(
      screen.queryByRole('button', {
        name: textMock('process_editor.configuration_panel_set_datamodel_link'),
      }),
    ).not.toBeInTheDocument();
  });

  it('should render helpText for selected task', async () => {
    const user = userEvent.setup();
    renderConfigContent();
    const helpTextButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_header_help_text_title'),
    });
    user.click(helpTextButton);
    const helpText = await screen.findByText(
      textMock('process_editor.configuration_panel_header_help_text_data'),
    );
    expect(helpText).toBeInTheDocument();
  });

  it('should display the connected data model as selected by default when data type is connected to task', () => {
    const connectedDataType = 'dataModel0';
    const existingLayoutSets: LayoutSets = {
      sets: [
        {
          id: layoutSetIdToUpdate,
          tasks: [mockTaskId],
          dataType: connectedDataType,
        },
      ],
    };
    renderConfigContent({ layoutSets: existingLayoutSets });
    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_set_datamodel'),
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(connectedDataType)).toBeInTheDocument();
  });
});

const renderConfigContent = (
  bpmnApiContextProps: Partial<BpmnApiContextProps> = {},
  rootContextProps: Partial<BpmnContextProps> = {},
) => {
  return render(
    <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextProps }}>
      <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...rootContextProps }}>
        <BpmnConfigPanelFormContextProvider>
          <ConfigContent />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
