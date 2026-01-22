import type { StudioLibraryElementProps, StudioLibraryElementTexts } from './StudioLibraryElement';
import { StudioLibraryElement } from './StudioLibraryElement';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import React from 'react';

// Test data:
const href = '#';
const latestPublishedVersion = '1';
const name = 'default-name';
const texts: StudioLibraryElementTexts = {
  published: 'Published',
  unnamed: 'Unnamed',
  version: (version: string) => `Version ${version}`,
};
const defaultProps: StudioLibraryElementProps = {
  href,
  latestPublishedVersion,
  name,
  onClick: jest.fn(),
  texts,
};

describe('StudioLibraryElement', () => {
  it('Renders the element with the given information', () => {
    renderLibraryElement();
    expect(screen.getByText(name)).toBeInTheDocument();
    expect(screen.getByText(texts.published)).toBeInTheDocument();
    expect(screen.getByText(texts.version(latestPublishedVersion))).toBeInTheDocument();
  });

  it('Renders the "unnamed" text when name is null', () => {
    renderLibraryElement({ name: null });
    expect(screen.getByText(texts.unnamed)).toBeInTheDocument();
  });

  it('Does not render the published tag when latestPublishedVersion is null', () => {
    renderLibraryElement({ latestPublishedVersion: null });
    expect(screen.queryByText(texts.published)).not.toBeInTheDocument();
  });

  it('Calls onClick when the element is clicked', async () => {
    const onClick = jest.fn();
    renderLibraryElement({ onClick });
    const user = userEvent.setup();
    await user.click(screen.getByRole('link'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('Displays the info text when given', () => {
    const info = 'Some info text';
    renderLibraryElement({ info });
    expect(screen.getByText(info)).toBeInTheDocument();
  });
});

const renderLibraryElement = (props: Partial<StudioLibraryElementProps> = {}): RenderResult =>
  render(<StudioLibraryElement {...defaultProps} {...props} />);
