import React from 'react';
import { HeadingBar } from './HeadingBar';
import { render, screen } from '@testing-library/react';
import type { HeadingBarProps } from './HeadingBar';
import { mockTexts } from '../../mocks/mockTexts';
import { ViewType } from '../../types/ViewType';

// Test data
const onViewChange = jest.fn();

describe('HeadingBar', () => {
  it('should render the heading', () => {
    renderHeadingBar();
    const heading = screen.getByRole('heading', { name: mockTexts.heading });

    expect(heading).toBeInTheDocument();
  });

  it('should not render toggle group when selectedView is not provided', () => {
    renderHeadingBar();
    const previewToggle = screen.queryByRole('radio', { name: mockTexts.preview });
    const fileBrowserToggle = screen.queryByRole('radio', { name: mockTexts.fileBrowser });

    expect(previewToggle).not.toBeInTheDocument();
    expect(fileBrowserToggle).not.toBeInTheDocument();
  });

  it('should not render toggle group when onViewChange is not provided', () => {
    renderHeadingBar({ selectedView: ViewType.Preview });
    const previewToggle = screen.queryByRole('radio', { name: mockTexts.preview });
    const fileBrowserToggle = screen.queryByRole('radio', { name: mockTexts.fileBrowser });

    expect(previewToggle).not.toBeInTheDocument();
    expect(fileBrowserToggle).not.toBeInTheDocument();
  });

  it('should render toggle group when both selectedView and onViewChange are provided', () => {
    renderHeadingBar({ selectedView: ViewType.Preview, onViewChange });
    const previewToggle = screen.getByRole('radio', { name: mockTexts.preview });
    const fileBrowserToggle = screen.getByRole('radio', { name: mockTexts.fileBrowser });

    expect(previewToggle).toBeInTheDocument();
    expect(fileBrowserToggle).toBeInTheDocument();
  });
});

const defaultProps: HeadingBarProps = {
  texts: mockTexts,
};

const renderHeadingBar = (props?: Partial<HeadingBarProps>): void => {
  render(<HeadingBar {...defaultProps} {...props} />);
};
