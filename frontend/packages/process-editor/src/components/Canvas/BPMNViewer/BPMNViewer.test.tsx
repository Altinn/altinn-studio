import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BPMNViewer, BPMNViewerProps } from './BPMNViewer';
import { textMock } from '../../../../../../testing/mocks/i18nMock';

const mockAppLibVersion8: string = '8.0.1';
const mockAppLibVersion7: string = '7.0.1';

const defaultProps: BPMNViewerProps = {
  appLibVersion: mockAppLibVersion8,
};

describe('Viewer', () => {
  afterEach(jest.clearAllMocks);

  it('displays version alert when version is 7 or older', async () => {
    const user = userEvent.setup();
    render(<BPMNViewer {...defaultProps} appLibVersion={mockAppLibVersion7} />);

    // Fix to remove act error
    await act(() => user.tab());

    const alertTitle = screen.getByRole('heading', {
      name: textMock('process_editor.too_old_version_title'),
      level: 1,
    });
    expect(alertTitle).toBeInTheDocument;
  });

  it('hides version alert when version is 8 or newer', async () => {
    const user = userEvent.setup();
    render(<BPMNViewer {...defaultProps} />);

    // Fix to remove act error
    await act(() => user.tab());

    const alertTitle = screen.queryByRole('heading', {
      name: textMock('process_editor.too_old_version_title'),
      level: 1,
    });
    expect(alertTitle).not.toBeInTheDocument;
  });
});
