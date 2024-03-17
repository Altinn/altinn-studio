import React from 'react';
import { ConfigPanel } from './ConfigPanel';
import { render, screen } from '@testing-library/react';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import type { BpmnContextProps } from '../../contexts/BpmnContext';
import { BpmnContext } from '../../contexts/BpmnContext';
import type { BpmnDetails } from '../../types/BpmnDetails';
import { BpmnTypeEnum } from '../../enum/BpmnTypeEnum';
import { BpmnConfigPanelFormContextProvider } from '../../contexts/BpmnConfigPanelContext';
import Modeler from 'bpmn-js/lib/Modeler';

const mockBpmnDetails: BpmnDetails = {
  id: 'testId',
  name: 'testName',
  taskType: 'data',
  type: BpmnTypeEnum.Task,
};

const mockBpmnContextValue: BpmnContextProps = {
  bpmnXml: `<?xml version="1.0" encoding="UTF-8"?></xml>`,
  appLibVersion: '8.0.3',
  numberOfUnsavedChanges: 0,
  setNumberOfUnsavedChanges: jest.fn(),
  getUpdatedXml: jest.fn(),
  isEditAllowed: true,
  bpmnDetails: mockBpmnDetails,
  setBpmnDetails: jest.fn(),
};

describe('ConfigPanel', () => {
  it('should render no selected task message', () => {
    renderConfigPanel({ bpmnDetails: null });
    const title = screen.getByRole('heading', {
      name: textMock('process_editor.configuration_panel_no_task_title'),
    });

    const message = screen.getByText(
      textMock('process_editor.configuration_panel_no_task_message'),
    );

    expect(title).toBeInTheDocument();
    expect(message).toBeInTheDocument();
  });

  it('should render no supported element message', () => {
    renderConfigPanel({ bpmnDetails: { ...mockBpmnDetails, type: BpmnTypeEnum.SequenceFlow } });
    const title = screen.getByRole('heading', {
      name: textMock('process_editor.configuration_panel_element_not_supported_title'),
    });
    const message = screen.getByText(
      textMock('process_editor.configuration_panel_element_not_supported'),
    );
    expect(title).toBeInTheDocument();
    expect(message).toBeInTheDocument();
  });

  it('should render ConfigPanel if task is supported', () => {
    renderConfigPanel({
      modelerRef: { current: '' as unknown as Modeler },
      bpmnDetails: { ...mockBpmnDetails, type: BpmnTypeEnum.Task },
    });
    const editTaskIdButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_change_task_id'),
    });
    expect(editTaskIdButton).toBeInTheDocument();
  });
});

const renderConfigPanel = (rootContextProps: Partial<BpmnContextProps> = {}) => {
  return render(
    <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...rootContextProps }}>
      <BpmnConfigPanelFormContextProvider>
        <ConfigPanel />
      </BpmnConfigPanelFormContextProvider>
    </BpmnContext.Provider>,
  );
};
