import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BPMNViewerErrorAlert } from './BPMNViewerErrorAlert';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';

describe('Viewer', () => {
  afterEach(jest.clearAllMocks);

  it('displays correct error message when bpmnViewerError is "noDiagram"', async () => {
    const user = userEvent.setup();
    render(<BPMNViewerErrorAlert bpmnViewerError='noDiagram' />);

    user.tab();

    const heading = await screen.findByRole('heading', {
      name: textMock('process_editor.not_found_diagram_heading'),
    });
    const paragraph = screen.getByText(textMock('process_editor.not_found_diagram_error_message'));

    expect(heading).toBeInTheDocument();
    expect(paragraph).toBeInTheDocument();
  });

  it('displays correct error message when bpmnViewerError is "noProcess"', async () => {
    const user = userEvent.setup();
    render(<BPMNViewerErrorAlert bpmnViewerError='noProcess' />);

    user.tab();

    const heading = await screen.findByRole('heading', {
      name: textMock('process_editor.not_found_process_heading'),
    });
    const paragraph = screen.getByText(textMock('process_editor.not_found_process_error_message'));

    expect(heading).toBeInTheDocument();
    expect(paragraph).toBeInTheDocument();
  });

  it('displays correct error message when bpmnViewerError is "unknown"', async () => {
    const user = userEvent.setup();
    render(<BPMNViewerErrorAlert bpmnViewerError='unknown' />);

    user.tab();

    const heading = await screen.findByRole('heading', {
      name: textMock('process_editor.unknown_heading_error_message'),
    });
    const paragraph = screen.getByText(textMock('process_editor.unknown_paragraph_error_message'));

    expect(heading).toBeInTheDocument();
    expect(paragraph).toBeInTheDocument();
  });
});
