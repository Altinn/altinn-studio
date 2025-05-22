import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BPMNViewer } from './BPMNViewer';
import { BpmnContextProvider } from '../../../contexts/BpmnContext';

describe('Viewer', () => {
  it('should render the BPMN viewer', async () => {
    const user = userEvent.setup();
    render(
      <BpmnContextProvider appLibVersion={'8.0.0'}>
        <BPMNViewer />
      </BpmnContextProvider>,
    );

    await user.tab();

    const alertTitle = screen.getByRole('link', { name: 'Powered by bpmn.io' });
    expect(alertTitle).toBeInTheDocument();
  });
});
