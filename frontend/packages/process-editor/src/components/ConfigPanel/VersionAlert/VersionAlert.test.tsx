import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { BpmnContextProvider } from '../../../contexts/BpmnContext';
import { VersionAlert } from './VersionAlert';

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;
const mockAppLibVersion7: string = '7.0.3';

describe('VersionAlert', () => {
  it('should render VersionAlert', () => {
    render(mockAppLibVersion7);
    expect(
      screen.getByRole('heading', { name: textMock('process_editor.too_old_version_title') }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        textMock('process_editor.too_old_version_text', { version: mockAppLibVersion7 }),
      ),
    );
  });

  const render = (appLibVersion?: string) => {
    return rtlRender(
      <BpmnContextProvider
        bpmnXml={mockBPMNXML}
        appLibVersion={appLibVersion || mockAppLibVersion7}
      >
        <VersionAlert />
      </BpmnContextProvider>,
    );
  };
});
