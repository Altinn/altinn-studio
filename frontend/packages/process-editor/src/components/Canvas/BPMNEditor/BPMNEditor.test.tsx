import React from 'react';
import { render, screen } from '@testing-library/react';
import { BPMNEditor } from './BPMNEditor';
import { BpmnApiContextProvider } from '../../../contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from '../../../contexts/BpmnConfigPanelContext';
import { textMock } from '@studio/testing/mocks/i18nMock';

jest.mock('../../../hooks/useBpmnEditor', () => ({
  useBpmnEditor: jest.fn().mockReturnValue(jest.fn()),
}));

describe('BPMNEditor', () => {
  afterEach(jest.clearAllMocks);

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
