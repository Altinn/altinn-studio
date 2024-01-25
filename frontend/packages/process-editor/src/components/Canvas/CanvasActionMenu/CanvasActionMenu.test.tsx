import React from 'react';
import { render as rtlRender, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CanvasActionMenuProps } from './CanvasActionMenu';
import { CanvasActionMenu } from './CanvasActionMenu';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { BpmnContextProvider } from '../../../contexts/BpmnContext';

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;

const mockAppLibVersion7: string = '7.0.0';
const mockAppLibVersion8: string = '8.0.0';

const mockOnSave = jest.fn();

const defaultProps: CanvasActionMenuProps = {
  onSave: mockOnSave,
};

describe('CanvasActionMenu', () => {
  afterEach(jest.clearAllMocks);

  it('hides the save button when the version is too old', async () => {
    const user = userEvent.setup();
    render(mockAppLibVersion7);

    // Fix to remove act error
    await act(() => user.tab());

    const editButton = screen.queryByRole('button', { name: textMock('process_editor.save') });
    expect(editButton).not.toBeInTheDocument();
  });

  it('calls "onSave" when the user is in edit more and clicks save button', async () => {
    const user = userEvent.setup();
    render();

    const editButton = screen.getByRole('button', { name: textMock('process_editor.save') });
    await act(() => user.click(editButton));

    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });
});

const render = (appLibVersion?: string) => {
  return rtlRender(
    <BpmnContextProvider bpmnXml={mockBPMNXML} appLibVersion={appLibVersion || mockAppLibVersion8}>
      <CanvasActionMenu {...defaultProps} />
    </BpmnContextProvider>,
  );
};
