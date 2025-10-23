import React from 'react';
import { ToolColumn } from './ToolColumn';
import { render, screen } from '@testing-library/react';
import type { ToolColumnProps } from './ToolColumn';
import { ToolColumnMode } from '../../types/ToolColumnMode';

describe('ToolColumn', () => {
  it('should render preview placeholder when in Preview mode and no custom content provided', () => {
    renderToolColumn({ mode: ToolColumnMode.Preview });
    const previewPlaceholder = screen.getByText('Preview placeholder');

    expect(previewPlaceholder).toBeInTheDocument();
  });

  it('should render custom preview content when provided', () => {
    const customContent = <div>Custom preview content</div>;
    renderToolColumn({ mode: ToolColumnMode.Preview, previewContent: customContent });
    const customPreview = screen.getByText('Custom preview content');

    expect(customPreview).toBeInTheDocument();
  });

  it('should render file browser placeholder when in FileExplorer mode and no custom content provided', () => {
    renderToolColumn({ mode: ToolColumnMode.FileExplorer });
    const srcFolder = screen.getByText(/src/);
    const appFile = screen.getByText(/App.tsx/);

    expect(srcFolder).toBeInTheDocument();
    expect(appFile).toBeInTheDocument();
  });

  it('should render custom file browser content when provided', () => {
    const customContent = <div>Custom file browser content</div>;
    renderToolColumn({ mode: ToolColumnMode.FileExplorer, fileBrowserContent: customContent });
    const customFileBrowser = screen.getByText('Custom file browser content');

    expect(customFileBrowser).toBeInTheDocument();
  });

  it('should not render file browser placeholder when selectedView is Preview', () => {
    renderToolColumn({ mode: ToolColumnMode.Preview });
    const srcFolder = screen.queryByText('src');

    expect(srcFolder).not.toBeInTheDocument();
  });

  it('should not render preview placeholder when selectedView is FileExplorer', () => {
    renderToolColumn({ mode: ToolColumnMode.FileExplorer });
    const previewPlaceholder = screen.queryByText('Preview placeholder');

    expect(previewPlaceholder).not.toBeInTheDocument();
  });
});

const defaultProps: ToolColumnProps = {
  mode: ToolColumnMode.Preview,
  previewContent: <p>Preview</p>,
};

const renderToolColumn = (props?: Partial<ToolColumnProps>): void => {
  render(<ToolColumn {...defaultProps} {...props} />);
};
