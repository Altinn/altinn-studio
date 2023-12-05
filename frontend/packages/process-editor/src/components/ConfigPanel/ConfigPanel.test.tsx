import React from 'react';
import { ConfigPanel } from './ConfigPanel';
import { render, screen } from '@testing-library/react';
import { textMock } from '../../../../../testing/mocks/i18nMock';

describe('ConfigPanel', () => {
  it('should render without crashing', () => {
    render(<ConfigPanel appLibVersion='1.0.0' />);
    expect(
      screen.getByRole('heading', { name: textMock('process_editor.configuration_panel_heading') }),
    ).toBeInTheDocument();
  });

  it('should render the app lib version warning if version < 8.0.0', () => {
    render(<ConfigPanel appLibVersion='7.0.0' />);
    expect(screen.getByText(textMock('process_editor.too_old_version_title'))).toBeInTheDocument();
  });

  it('should not render the app lib version warning if version >= 8.0.0', () => {
    render(<ConfigPanel appLibVersion='8.0.0' />);
    expect(
      screen.queryByText(textMock('process_editor.too_old_version_title')),
    ).not.toBeInTheDocument();
  });
});
