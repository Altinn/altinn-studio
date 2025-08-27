import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ConfigViewerPanel } from './ConfigViewerPanel';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useBpmnContext } from '../../contexts/BpmnContext';

jest.mock('../../contexts/BpmnContext', () => ({
  useBpmnContext: jest.fn(),
}));

describe('ConfigViewerPanel', () => {
  it('should render config header with correct heading', () => {
    (useBpmnContext as jest.Mock).mockReturnValue({ bpmnDetails: { taskType: 'data' } });

    render(<ConfigViewerPanel />);
    const configTitle = screen.getByRole('heading', {
      name: textMock('process_editor.configuration_panel_data_task'),
      level: 2,
    });

    expect(configTitle).toBeInTheDocument();
  });

  it('should render config header with correct help text', async () => {
    const user = userEvent.setup();
    (useBpmnContext as jest.Mock).mockReturnValue({ bpmnDetails: { taskType: 'data' } });

    render(<ConfigViewerPanel />);

    const helpTextButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_header_help_text_title'),
    });

    await user.click(helpTextButton);

    const configHeaderHelpText = screen.getByText(
      textMock('process_editor.configuration_panel_header_help_text_data'),
    );

    expect(configHeaderHelpText).toBeInTheDocument();
  });

  it('should render task id', () => {
    (useBpmnContext as jest.Mock).mockReturnValue({
      bpmnDetails: {
        id: 'testId',
        taskType: 'data',
      },
    });

    render(<ConfigViewerPanel />);
    expect(screen.getByText('testId')).toBeInTheDocument();
  });

  it('should render task name', () => {
    (useBpmnContext as jest.Mock).mockReturnValue({
      bpmnDetails: {
        name: 'testName',
        taskType: 'data',
      },
    });

    render(<ConfigViewerPanel />);
    expect(screen.getByText('testName')).toBeInTheDocument();
  });

  it('should render alert when bpmnDetails is null', () => {
    (useBpmnContext as jest.Mock).mockReturnValue({ bpmnDetails: null });
    render(<ConfigViewerPanel />);

    const alertTitle = screen.getByRole('heading', {
      name: textMock('process_editor.configuration_view_panel_no_task'),
    });

    const alertMessage = screen.getByText(
      textMock('process_editor.configuration_view_panel_please_choose_task'),
    );

    expect(alertTitle).toBeInTheDocument();
    expect(alertMessage).toBeInTheDocument();
  });
});
