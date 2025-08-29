import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { BpmnContextProvider } from '../../../contexts/BpmnContext';
import { VersionHelpText } from './VersionHelpText';

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;
const mockAppLibVersion7: string = '7.0.3';

describe('VersionHelpText', () => {
  it('should render VersionHelpText', () => {
    render(mockAppLibVersion7);
    const tooOldText = screen.getByText(textMock('process_editor.too_old_version_title'));
    expect(tooOldText).toBeInTheDocument();
  });

  const render = (appLibVersion?: string) => {
    return rtlRender(
      <BpmnContextProvider
        bpmnXml={mockBPMNXML}
        appLibVersion={appLibVersion || mockAppLibVersion7}
      >
        <VersionHelpText />
      </BpmnContextProvider>,
    );
  };
});
