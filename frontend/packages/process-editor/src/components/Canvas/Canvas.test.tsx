import React from 'react';
import { render as rtlRender, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Canvas, CanvasProps } from './Canvas';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { BpmnContextProvider } from '../../contexts/BpmnContext';

const mockOnSave = jest.fn();

const mockAppLibVersion8: string = '8.0.1';
const mockAppLibVersion7: string = '7.0.1';

const defaultProps: CanvasProps = {
  onSave: mockOnSave,
};

describe('Canvas', () => {
  afterEach(jest.clearAllMocks);

  it('hides actionMenu when version is 7 or older', async () => {
    const user = userEvent.setup();
    render(mockAppLibVersion7);

    // Fix to remove act error
    await act(() => user.tab());

    const editButton = screen.queryByRole('button', { name: textMock('process_editor.edit_mode') });
    expect(editButton).not.toBeInTheDocument;
  });

  it('shows actionMenu when version is 8 or newer', async () => {
    const user = userEvent.setup();
    render(mockAppLibVersion8);

    // Fix to remove act error
    await act(() => user.tab());

    const editButton = screen.getByRole('button', { name: textMock('process_editor.edit_mode') });
    expect(editButton).toBeInTheDocument;
  });

  const render = (appLibVersion: string) => {
    return rtlRender(
      <BpmnContextProvider bpmnXml={''} appLibVersion={appLibVersion}>
        <Canvas {...defaultProps} />
      </BpmnContextProvider>,
    );
  };
});
