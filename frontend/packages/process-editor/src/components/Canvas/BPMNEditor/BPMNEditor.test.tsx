import React from 'react';
import { render, screen } from '@testing-library/react';
import { BPMNEditor } from './BPMNEditor';
import { BpmnApiContextProvider } from '../../../contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from '../../../contexts/BpmnConfigPanelContext';
import { textMock } from '../../../../../../testing/mocks/i18nMock';

jest.mock('../../../hooks/useBpmnEditor', () => ({
  useBpmnEditor: jest.fn().mockReturnValue({
    canvasRef: { current: document.createElement('div') },
  }),
}));

describe('BPMNEditor', () => {
  it('render spinner when pendingApiOperations is true', () => {
    render(
      <BpmnApiContextProvider pendingApiOperations={true}>
        <BpmnConfigPanelFormContextProvider>
          <BPMNEditor />
        </BpmnConfigPanelFormContextProvider>
      </BpmnApiContextProvider>,
    );

    screen.getByText(textMock('process_editor.loading'));
  });

  it('does not render spinner when pendingApiOperations is false', () => {
    render(
      <BpmnApiContextProvider pendingApiOperations={false}>
        <BpmnConfigPanelFormContextProvider>
          <BPMNEditor />
        </BpmnConfigPanelFormContextProvider>
      </BpmnApiContextProvider>,
    );

    const spinner = screen.queryByText(textMock('process_editor.loading'));
    expect(spinner).not.toBeInTheDocument();
  });
});
