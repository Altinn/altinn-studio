import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ProcessEditor, ProcessEditorProps } from './ProcessEditor';
import { textMock } from '../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;

const mockAppLibVersion8: string = '8.0.3';
const mockAppLibVersion7: string = '7.0.3';

const mockOnSave = jest.fn();

describe('ProcessEditor', () => {
  afterEach(jest.clearAllMocks);

  const defaultProps: ProcessEditorProps = {
    bpmnXml: mockBPMNXML,
    onSave: mockOnSave,
    appLibVersion: mockAppLibVersion8,
  };

  it('should render loading while bpmnXml is undefined', () => {
    render(<ProcessEditor {...defaultProps} bpmnXml={undefined} />);
    expect(screen.getByTitle(textMock('process_editor.loading'))).toBeInTheDocument();
  });

  it('should render "NoBpmnFoundAlert" when bpmnXml is null', () => {
    render(<ProcessEditor {...defaultProps} bpmnXml={null} />);
    expect(
      screen.getByRole('heading', {
        name: textMock('process_editor.fetch_bpmn_error_title'),
        level: 2,
      }),
    ).toBeInTheDocument();
  });

  it('should render "canvas" when bpmnXml is provided and default render is view-mode', async () => {
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(() => {
      render(<ProcessEditor {...defaultProps} />);
    });

    expect(
      screen.getByRole('button', { name: textMock('process_editor.edit_mode') }),
    ).toBeInTheDocument();
  });

  it('does not display the alert when the version is 8 or newer', async () => {
    const user = userEvent.setup();
    render(<ProcessEditor {...defaultProps} />);

    // Fix to remove act error
    await act(() => user.tab());

    const alertHeader = screen.queryByRole('heading', {
      name: textMock('process_editor.too_old_version_title'),
      level: 1,
    });
    expect(alertHeader).not.toBeInTheDocument();
  });

  it('displays the alert when the version is 7 or older', async () => {
    const user = userEvent.setup();
    render(<ProcessEditor {...defaultProps} appLibVersion={mockAppLibVersion7} />);

    // Fix to remove act error
    await act(() => user.tab());

    const alertHeader = screen.getByRole('heading', {
      name: textMock('process_editor.too_old_version_title'),
      level: 1,
    });
    expect(alertHeader).toBeInTheDocument();
  });
});
