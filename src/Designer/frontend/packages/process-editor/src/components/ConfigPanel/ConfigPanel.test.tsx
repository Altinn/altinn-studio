import React from 'react';
import { ConfigPanel } from './ConfigPanel';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { BpmnContextProps } from '../../contexts/BpmnContext';
import { BpmnContext } from '../../contexts/BpmnContext';
import { BpmnTypeEnum } from '../../enum/BpmnTypeEnum';
import { BpmnConfigPanelFormContextProvider } from '../../contexts/BpmnConfigPanelContext';
import type Modeler from 'bpmn-js/lib/Modeler';
import { BpmnApiContextProvider } from '../../contexts/BpmnApiContext';
import { mockBpmnDetails } from '../../../test/mocks/bpmnDetailsMock';
import { StudioRecommendedNextActionContextProvider } from 'libs/studio-components-legacy/src';

jest.mock('./ConfigSequenceFlow', () => ({
  ConfigSequenceFlow: () => <h1>ConfigSequenceFlow Mocked Component</h1>,
}));

describe('ConfigPanel', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
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

  it('should render ConfigPanel if bpmn type is task', () => {
    renderConfigPanel({
      modelerRef: {
        current: {
          get: () => {},
        } as unknown as Modeler,
      },
      bpmnDetails: { ...mockBpmnDetails, type: BpmnTypeEnum.Task },
    });
    const editTaskIdButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_change_task_id'),
    });
    expect(editTaskIdButton).toBeInTheDocument();
  });

  it('should render sequence flow config panel if bpmn type is sequence flow', () => {
    renderConfigPanel({ bpmnDetails: { ...mockBpmnDetails, type: BpmnTypeEnum.SequenceFlow } });
    expect(
      screen.getByRole('heading', { name: 'ConfigSequenceFlow Mocked Component' }),
    ).toBeInTheDocument();
  });

  it('should display the details about the end event when bpmnDetails.type is "EndEvent"', () => {
    renderConfigPanel({ bpmnDetails: { ...mockBpmnDetails, type: BpmnTypeEnum.EndEvent } });
    expect(
      screen.getByText(textMock('process_editor.configuration_panel_end_event')),
    ).toBeInTheDocument();
  });

  it.each([
    {
      task: BpmnTypeEnum.Process,
      expectedText: 'process_editor.configuration_panel_no_task_title',
    },
    {
      task: BpmnTypeEnum.StartEvent,
      expectedText: 'process_editor.configuration_panel_element_not_supported_message',
    },
  ])('should display correct message based on selected bpmn type', ({ task, expectedText }) => {
    renderConfigPanel({
      modelerRef: { current: '' as unknown as Modeler },
      bpmnDetails: { ...mockBpmnDetails, type: task },
    });
    expect(screen.getByText(textMock(expectedText))).toBeInTheDocument();
  });
});

const renderConfigPanel = (rootContextProps: Partial<BpmnContextProps> = {}) => {
  return render(
    <BpmnContext.Provider value={{ ...rootContextProps }}>
      <BpmnApiContextProvider>
        <BpmnConfigPanelFormContextProvider>
          <StudioRecommendedNextActionContextProvider>
            <ConfigPanel />
          </StudioRecommendedNextActionContextProvider>
        </BpmnConfigPanelFormContextProvider>
      </BpmnApiContextProvider>
    </BpmnContext.Provider>,
  );
};
