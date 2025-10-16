import React from 'react';
import { HeadingBar } from './HeadingBar';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HeadingBarProps } from './HeadingBar';
import { mockTexts } from '../../mocks/mockTexts';
import { ToolColumnMode } from '../../types/ToolColumnMode';

// Test data
const onModeChange = jest.fn();

describe('HeadingBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the heading', () => {
    renderHeadingBar();
    const heading = screen.getByRole('heading', { name: mockTexts.heading });

    expect(heading).toBeInTheDocument();
  });

  it('should not render toggle group when selectedToolColumnMode is not provided', () => {
    renderHeadingBar();
    const previewToggle = screen.queryByRole('radio', { name: mockTexts.preview });
    const fileBrowserToggle = screen.queryByRole('radio', { name: mockTexts.fileBrowser });

    expect(previewToggle).not.toBeInTheDocument();
    expect(fileBrowserToggle).not.toBeInTheDocument();
  });

  it('should not render toggle group when onModeChange is not provided', () => {
    renderHeadingBar({ selectedToolColumnMode: ToolColumnMode.Preview });
    const previewToggle = screen.queryByRole('radio', { name: mockTexts.preview });
    const fileBrowserToggle = screen.queryByRole('radio', { name: mockTexts.fileBrowser });

    expect(previewToggle).not.toBeInTheDocument();
    expect(fileBrowserToggle).not.toBeInTheDocument();
  });

  it('should render toggle group when both selectedToolColumnMode and onModeChange are provided', () => {
    renderHeadingBar({ selectedToolColumnMode: ToolColumnMode.Preview, onModeChange });
    const previewToggle = screen.getByRole('radio', { name: mockTexts.preview });
    const fileBrowserToggle = screen.getByRole('radio', { name: mockTexts.fileBrowser });

    expect(previewToggle).toBeInTheDocument();
    expect(fileBrowserToggle).toBeInTheDocument();
  });

  it('should call onModeChange with correct mode when file browser toggle is clicked', async () => {
    const user = userEvent.setup();
    renderHeadingBar({ selectedToolColumnMode: ToolColumnMode.Preview, onModeChange });

    const fileBrowserToggle = screen.getByRole('radio', { name: mockTexts.fileBrowser });
    await user.click(fileBrowserToggle);

    expect(onModeChange).toHaveBeenCalledWith(ToolColumnMode.FileExplorer);
  });

  it('should call onModeChange with correct mode when preview toggle is clicked', async () => {
    const user = userEvent.setup();
    renderHeadingBar({ selectedToolColumnMode: ToolColumnMode.FileExplorer, onModeChange });

    const previewToggle = screen.getByRole('radio', { name: mockTexts.preview });
    await user.click(previewToggle);

    expect(onModeChange).toHaveBeenCalledWith(ToolColumnMode.Preview);
  });
});

const defaultProps: HeadingBarProps = {
  texts: mockTexts,
};

const renderHeadingBar = (props?: Partial<HeadingBarProps>): void => {
  render(<HeadingBar {...defaultProps} {...props} />);
};
