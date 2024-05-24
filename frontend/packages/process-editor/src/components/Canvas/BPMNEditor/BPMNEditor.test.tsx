import React from 'react';
import { render, screen } from '@testing-library/react';
import { BPMNEditor } from './BPMNEditor';
import { BpmnApiContextProvider } from '../../../contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from '../../../contexts/BpmnConfigPanelContext';
import { textMock } from '@studio/testing/mocks/i18nMock';

jest.mock('../../../hooks/useBpmnEditor', () => ({
  useBpmnEditor: jest.fn().mockReturnValue({
    canvasRef: { current: document.createElement('div') },
  }),
}));

describe('BPMNEditor', () => {
  afterEach(jest.clearAllMocks);
  it('render spinner when pendingApiOperations is true', () => {
    renderBpmnEditor({ pendingApiOperations: true });

    screen.getByText(textMock('process_editor.loading'));
  });

  it('does not render spinner when pendingApiOperations is false', () => {
    renderBpmnEditor({ pendingApiOperations: false });

    const spinner = screen.queryByText(textMock('process_editor.loading'));
    expect(spinner).not.toBeInTheDocument();
  });
});

const renderBpmnEditor = ({ pendingApiOperations }) => {
  render(
    <BpmnApiContextProvider pendingApiOperations={pendingApiOperations}>
      <BpmnConfigPanelFormContextProvider>
        <BPMNEditor />
      </BpmnConfigPanelFormContextProvider>
    </BpmnApiContextProvider>,
  );
};
