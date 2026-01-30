import React from 'react';
import { render, screen } from '@testing-library/react';
import { Canvas } from './Canvas';
import { BpmnContextProvider } from '../../contexts/BpmnContext';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { AppVersion } from 'app-shared/types/AppVersion';

jest.mock('./BPMNViewer', () => ({
  BPMNViewer: () => <div data-testid='bpmn-viewer' />,
}));

jest.mock('./BPMNEditor', () => ({
  BPMNEditor: () => <div data-testid='bpmn-editor' />,
}));

const renderCanvas = (appVersion: AppVersion) => {
  return render(
    <BpmnContextProvider appVersion={appVersion}>
      <Canvas />
    </BpmnContextProvider>,
  );
};

describe('Canvas', () => {
  it('should render bpmn viewer when app lib version is lower than 8', () => {
    renderCanvas({ backendVersion: '7.0.0', frontendVersion: '4.0.0' });
    expect(screen.getByTestId('bpmn-viewer')).toBeInTheDocument();
  });

  it('should render bpmn editor when app lib version is 8 or higher', () => {
    renderCanvas({ backendVersion: '8.0.0', frontendVersion: '4.0.0' });
    expect(screen.getByTestId('bpmn-editor')).toBeInTheDocument();
  });

  it('displays the alert when the version is 7 or older', () => {
    renderCanvas({ backendVersion: '7.0.0', frontendVersion: '4.0.0' });
    const tooOldText = screen.getByText(textMock('process_editor.too_old_version_title'));
    expect(tooOldText).toBeInTheDocument();
  });
});
