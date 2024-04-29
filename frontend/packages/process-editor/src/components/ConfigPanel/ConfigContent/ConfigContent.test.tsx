import React from 'react';
import { ConfigContent } from './ConfigContent';
import { render, screen } from '@testing-library/react';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import type { BpmnContextProps } from '../../../contexts/BpmnContext';
import { BpmnContext } from '../../../contexts/BpmnContext';
import type { BpmnDetails } from '../../../types/BpmnDetails';
import { BpmnTypeEnum } from '../../../enum/BpmnTypeEnum';
import userEvent from '@testing-library/user-event';
import type Modeler from 'bpmn-js/lib/Modeler';
import { type BpmnTaskType } from '../../../types/BpmnTaskType';
import { BpmnConfigPanelFormContextProvider } from '../../../contexts/BpmnConfigPanelContext';
import { BpmnApiContextProvider } from '../../../contexts/BpmnApiContext';

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
  getUpdatedXml: jest.fn(),
  isEditAllowed: true,
  bpmnDetails: mockBpmnDetails,
  setBpmnDetails: jest.fn(),
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
      modelerRef: { current: { get: () => {} } as unknown as Modeler },
      bpmnDetails: { ...mockBpmnDetails, taskType: 'data' as BpmnTaskType },
    });

    screen.getByRole('heading', {
      name: textMock('process_editor.configuration_panel_data_task'),
      level: 2,
    });
  });

  it('should render helpText for selected task', async () => {
    const user = userEvent.setup();
    renderConfigContent({
      modelerRef: { current: { get: () => {} } as unknown as Modeler },
      bpmnDetails: { ...mockBpmnDetails, taskType: 'data' as BpmnTaskType },
    });

    const helpTextButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_header_help_text_title'),
    });
    await user.click(helpTextButton);

    screen.getByText(textMock('process_editor.configuration_panel_header_help_text_data'));
  });

  it('should render EditTaskId component', () => {
    renderConfigContent({
      modelerRef: { current: { get: () => {} } as unknown as Modeler },
      bpmnDetails: { ...mockBpmnDetails, taskType: 'data' as BpmnTaskType },
    });

    screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_change_task_id'),
    });
  });

  it.each(['data', 'confirmation', 'feedback', 'signing'])(
    'should render correct header config for each taskType',
    (taskType) => {
      renderConfigContent({
        modelerRef: { current: { get: () => {} } as unknown as Modeler },
        bpmnDetails: { ...mockBpmnDetails, taskType: taskType as BpmnTaskType },
      });

      screen.getByRole('heading', {
        name: textMock(`process_editor.configuration_panel_${taskType}_task`),
        level: 2,
      });
    },
  );
});

const renderConfigContent = (rootContextProps: Partial<BpmnContextProps> = {}) => {
  return render(
    <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...rootContextProps }}>
      <BpmnApiContextProvider>
        <BpmnConfigPanelFormContextProvider>
          <ConfigContent />
        </BpmnConfigPanelFormContextProvider>
      </BpmnApiContextProvider>
    </BpmnContext.Provider>,
  );
};
