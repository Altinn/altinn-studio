import React from 'react';
import { ConfigPanel } from './ConfigPanel';
import { render as rtlRender, screen } from '@testing-library/react';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { BpmnContextProvider } from '../../contexts/BpmnContext';

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;
const mockAppLibVersion8: string = '8.0.3';
const mockAppLibVersion7: string = '7.0.3';

describe('ConfigPanel', () => {
  it('should render without crashing', () => {
    render('1.0.0');
    expect(
      screen.getByRole('heading', { name: textMock('process_editor.configuration_panel_heading') }),
    ).toBeInTheDocument();
  });

  it('should render the app lib version warning if version < 8.0.0', () => {
    render();
    expect(screen.getByText(textMock('process_editor.too_old_version_title'))).toBeInTheDocument();
  });

  it('should not render the app lib version warning if version >= 8.0.0', () => {
    render(mockAppLibVersion8);
    expect(
      screen.queryByText(textMock('process_editor.too_old_version_title')),
    ).not.toBeInTheDocument();
  });

  const render = (appLibVersion?: string) => {
    return rtlRender(
      <BpmnContextProvider
        bpmnXml={mockBPMNXML}
        appLibVersion={appLibVersion || mockAppLibVersion7}
      >
        <ConfigPanel />
      </BpmnContextProvider>,
    );
  };
});
