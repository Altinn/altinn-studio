import React from 'react';
import { ConfigContent } from './ConfigContent';
import { act, render, screen } from '@testing-library/react';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import type { BpmnContextProps } from '../../../contexts/BpmnContext';
import { BpmnContext } from '../../../contexts/BpmnContext';
import type { BpmnDetails } from '../../../types/BpmnDetails';
import { BpmnTypeEnum } from '../../../enum/BpmnTypeEnum';
import userEvent from '@testing-library/user-event';
import type Modeler from 'bpmn-js/lib/Modeler';
import { type BpmnTaskType } from '../../../types/BpmnTaskType';
import { BpmnConfigPanelFormContextProvider } from '../../../contexts/BpmnConfigPanelContext';

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;
const mockAppLibVersion8: string = '8.0.3';

const mockId: string = 'testId';
const mockName: string = 'testName';

const mockBpmnDetails: BpmnDetails = {
  id: mockId,
  name: mockName,
  taskType: 'data',
  type: BpmnTypeEnum.Task,
};

const mockBpmnContextValue: BpmnContextProps = {
  bpmnXml: mockBPMNXML,
  appLibVersion: mockAppLibVersion8,
  numberOfUnsavedChanges: 0,
  setNumberOfUnsavedChanges: jest.fn(),
  getUpdatedXml: jest.fn(),
  isEditAllowed: true,
  bpmnDetails: mockBpmnDetails,
  setBpmnDetails: jest.fn(),
  dataTasksAdded: [],
  setDataTasksAdded: jest.fn(),
  dataTasksRemoved: [],
  setDataTasksRemoved: jest.fn(),
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
    renderConfigContent({
      modelerRef: { current: '<div></div>' as unknown as Modeler },
      bpmnDetails: { ...mockBpmnDetails, taskType: 'data' as BpmnTaskType },
    });

    const heading = screen.getByRole('heading', {
      name: textMock('process_editor.configuration_panel_data_task'),
      level: 2,
    });

    expect(heading).toBeInTheDocument();
  });

  it('should render helpText for selected task', async () => {
    const user = userEvent.setup();
    renderConfigContent({
      modelerRef: { current: '<div></div>' as unknown as Modeler },
      bpmnDetails: { ...mockBpmnDetails, taskType: 'data' as BpmnTaskType },
    });

    const helpTextButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_header_help_text_title'),
    });
    await act(() => user.click(helpTextButton));

    const helpText = screen.getByText(
      textMock('process_editor.configuration_panel_header_help_text_data'),
    );

    expect(helpText).toBeInTheDocument();
  });

  it('should render EditTaskId component', () => {
    renderConfigContent({
      modelerRef: { current: '<div></div>' as unknown as Modeler },
      bpmnDetails: { ...mockBpmnDetails, taskType: 'data' as BpmnTaskType },
    });

    const editTaskIdButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_change_task_id'),
    });

    expect(editTaskIdButton).toBeInTheDocument();
  });

  it.each(['data', 'confirmation', 'feedback', 'signing'])(
    'should render correct header config for each taskType',
    (taskType) => {
      renderConfigContent({
        modelerRef: { current: '<div></div>' as unknown as Modeler },
        bpmnDetails: { ...mockBpmnDetails, taskType: taskType as BpmnTaskType },
      });

      const heading = screen.getByRole('heading', {
        name: textMock(`process_editor.configuration_panel_${taskType}_task`),
        level: 2,
      });

      expect(heading).toBeInTheDocument();
    },
  );
});

const renderConfigContent = (rootContextProps: Partial<BpmnContextProps> = {}) => {
  return render(
    <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...rootContextProps }}>
      <BpmnConfigPanelFormContextProvider>
        <ConfigContent />
      </BpmnConfigPanelFormContextProvider>
    </BpmnContext.Provider>,
  );
};
