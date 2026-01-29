import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { BpmnContextProvider } from '../../../contexts/BpmnContext';
import { VersionHelpText } from './VersionHelpText';
import type { AppVersion } from 'app-shared/types/AppVersion';

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;
const mockAppVersion: AppVersion = {
  backendVersion: '7.0.3',
  frontendVersion: '4.0.0',
};

describe('VersionHelpText', () => {
  it('should render VersionHelpText', () => {
    render(mockAppVersion);
    const tooOldText = screen.getByText(textMock('process_editor.too_old_version_title'));
    expect(tooOldText).toBeInTheDocument();
  });

  const render = (appVersion?: AppVersion) => {
    return rtlRender(
      <BpmnContextProvider bpmnXml={mockBPMNXML} appVersion={appVersion || mockAppVersion}>
        <VersionHelpText />
      </BpmnContextProvider>,
    );
  };
});
