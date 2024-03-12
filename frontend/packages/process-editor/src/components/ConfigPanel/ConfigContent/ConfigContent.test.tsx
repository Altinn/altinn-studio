import React from 'react';
import { ConfigContent } from './ConfigContent';
import { act, render, screen } from '@testing-library/react';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import type { BpmnContextProps } from '../../../contexts/BpmnContext';
import { BpmnContext } from '../../../contexts/BpmnContext';
import type { BpmnDetails } from '../../../types/BpmnDetails';
import { BpmnTypeEnum } from '../../../enum/BpmnTypeEnum';
import userEvent from '@testing-library/user-event';

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
};

describe('ConfigContent', () => {
  it('should render heading for selected task', () => {
    renderConfigContent({ bpmnDetails: { ...mockBpmnDetails, taskType: 'data' } });

    const heading = screen.getByRole('heading', {
      name: textMock('process_editor.configuration_panel_data_task'),
      level: 2,
    });

    expect(heading).toBeInTheDocument();
  });

  it('should render helpText for selected task', async () => {
    const user = userEvent.setup();
    renderConfigContent({ bpmnDetails: { ...mockBpmnDetails, taskType: 'data' } });

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
    renderConfigContent({ bpmnDetails: { ...mockBpmnDetails, taskType: 'data' } });

    const editTaskIdButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_change_task_id'),
    });

    expect(editTaskIdButton).toBeInTheDocument();
  });

  it('should be able to change task id', async () => {
    const user = userEvent.setup();
    renderConfigContent({ bpmnDetails: { ...mockBpmnDetails, taskType: 'data' } });

    const editTaskIdButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_change_task_id'),
    });

    await act(() => user.click(editTaskIdButton));
    const input = screen.getByLabelText(
      textMock('process_editor.configuration_panel_change_task_id'),
    );

    await act(() => user.clear(input));
    await act(() => user.type(input, 'newId'));

    // TODO implement test for saving the new id
    expect(false).toBeTruthy();
  });

  it.each(['data', 'confirmation', 'feedback', 'signing'])(
    'should render correct header config for each taskType',
    (taskType) => {
      renderConfigContent({ bpmnDetails: { ...mockBpmnDetails, taskType } });

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
      <ConfigContent />
    </BpmnContext.Provider>,
  );
};
