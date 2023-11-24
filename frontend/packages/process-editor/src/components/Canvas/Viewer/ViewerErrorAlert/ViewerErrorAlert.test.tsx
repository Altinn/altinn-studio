import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ViewerErrorAlert } from './ViewerErrorAlert';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';

describe('Viewer', () => {
  afterEach(jest.clearAllMocks);

  it('displays correct error message when bpmnViewerError is "noDiagram"', async () => {
    const user = userEvent.setup();
    render(<ViewerErrorAlert bpmnViewerError='noDiagram' />);

    // Fix to remove act error
    await act(() => user.tab());

    const heading = screen.getByRole('heading', {
      name: textMock('process_editor.not_found_diagram_heading'),
    });
    const paragraph = screen.getByText(textMock('process_editor.not_found_diagram_error_message'));

    expect(heading).toBeInTheDocument();
    expect(paragraph).toBeInTheDocument();
  });

  it('displays correct error message when bpmnViewerError is "noProcess"', async () => {
    const user = userEvent.setup();
    render(<ViewerErrorAlert bpmnViewerError='noProcess' />);

    // Fix to remove act error
    await act(() => user.tab());

    const heading = screen.getByRole('heading', {
      name: textMock('process_editor.not_found_process_heading'),
    });
    const paragraph = screen.getByText(textMock('process_editor.not_found_process_error_message'));

    expect(heading).toBeInTheDocument();
    expect(paragraph).toBeInTheDocument();
  });

  it('displays correct error message when bpmnViewerError is "unknown"', async () => {
    const user = userEvent.setup();
    render(<ViewerErrorAlert bpmnViewerError='unknown' />);

    // Fix to remove act error
    await act(() => user.tab());

    const heading = screen.getByRole('heading', {
      name: textMock('process_editor.unknown_heading_error_message'),
    });
    const paragraph = screen.getByText(textMock('process_editor.unknown_paragraph_error_message'));

    expect(heading).toBeInTheDocument();
    expect(paragraph).toBeInTheDocument();
  });
});
