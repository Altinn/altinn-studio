import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConfigPanelHeader, type ConfigPanelHeaderProps } from './ConfigPanelHeader';

describe('ConfigPanelHeader', () => {
  it('should render the header with full content', () => {
    renderConfigPanelHeader();
    const title = screen.getByText('Test Title');
    const helpText = screen.getByText('Help text content');
    const icon = screen.getByText('Icon');
    expect(title).toBeInTheDocument();
    expect(helpText).toBeInTheDocument();
    expect(icon).toBeInTheDocument();
  });

  it('should render the header without help text when not provided', () => {
    renderConfigPanelHeader({ helpText: undefined });
    const helpText = screen.queryByText('Help text content');
    expect(helpText).not.toBeInTheDocument();
  });
});

const renderConfigPanelHeader = (props: Partial<ConfigPanelHeaderProps> = {}) => {
  const defaultProps = {
    title: 'Test Title',
    icon: <span>Icon</span>,
    helpText: { text: 'Help text content', title: 'Help Title' },
  };

  const mergedProps = { ...defaultProps, ...props };

  render(<ConfigPanelHeader {...mergedProps} />);
};
