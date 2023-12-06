import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BPMNViewer } from './BPMNViewer';

describe('Viewer', () => {
  it('should render the BPMN viewer', async () => {
    const user = userEvent.setup();
    render(<BPMNViewer />);

    // Fix to remove act error
    await act(() => user.tab());

    const alertTitle = screen.getByRole('link', { name: 'Powered by bpmn.io' });
    expect(alertTitle).toBeInTheDocument;
  });
});
