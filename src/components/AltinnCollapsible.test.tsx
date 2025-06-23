import React from 'react';

import { jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AltinnCollapsible, AltinnCollapsibleList } from 'src/components/AltinnCollapsible';

// Mock the CSS module
jest.mock('src/components/AltinnCollapsible.module.css', () => ({
  collapsible: 'collapsible-class',
  collapsibleClosed: 'collapsible-closed-class',
}));

describe('AltinnCollapsible', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when open is true', () => {
    const childText = 'Collapsible content';
    render(
      <AltinnCollapsible open={true}>
        <div>{childText}</div>
      </AltinnCollapsible>,
    );

    expect(screen.getByText(childText)).toBeInTheDocument();
    const collapsibleDiv = screen.getByText(childText).parentElement;
    expect(collapsibleDiv).toHaveClass('collapsible-class');
    expect(collapsibleDiv).not.toHaveClass('collapsible-closed-class');
  });

  it('should apply closed class when open is false', () => {
    const childText = 'Collapsible content';
    render(
      <AltinnCollapsible open={false}>
        <div>{childText}</div>
      </AltinnCollapsible>,
    );

    expect(screen.getByText(childText)).toBeInTheDocument();
    const collapsibleDiv = screen.getByText(childText).parentElement;
    expect(collapsibleDiv).toHaveClass('collapsible-class');
    expect(collapsibleDiv).toHaveClass('collapsible-closed-class');
  });
});

describe('AltinnCollapsibleList', () => {
  const mockOnClickExpand = jest.fn();
  const listHeaderText = 'List Header';
  const childrenText = 'Collapsible Content';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render list header and children correctly when open', () => {
    render(
      <AltinnCollapsibleList
        open={true}
        onClickExpand={mockOnClickExpand}
        listHeader={<div>{listHeaderText}</div>}
      >
        <div>{childrenText}</div>
      </AltinnCollapsibleList>,
    );

    expect(screen.getByText(listHeaderText)).toBeInTheDocument();
    expect(screen.getByText(childrenText)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should call onClickExpand when header is clicked', () => {
    render(
      <AltinnCollapsibleList
        open={true}
        onClickExpand={mockOnClickExpand}
        listHeader={<div>{listHeaderText}</div>}
      >
        <div>{childrenText}</div>
      </AltinnCollapsibleList>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(mockOnClickExpand).toHaveBeenCalledTimes(1);
  });

  it('should call onClickExpand when Enter key is pressed', async () => {
    const user = userEvent.setup();
    render(
      <AltinnCollapsibleList
        open={true}
        onClickExpand={mockOnClickExpand}
        listHeader={<div>{listHeaderText}</div>}
      >
        <div>{childrenText}</div>
      </AltinnCollapsibleList>,
    );

    await user.tab(); // Focus the button
    await user.keyboard('{Enter}');
    expect(mockOnClickExpand).toHaveBeenCalledTimes(1);
  });

  it('should call onClickExpand when Space key is pressed', async () => {
    const user = userEvent.setup();
    render(
      <AltinnCollapsibleList
        open={true}
        onClickExpand={mockOnClickExpand}
        listHeader={<div>{listHeaderText}</div>}
      >
        <div>{childrenText}</div>
      </AltinnCollapsibleList>,
    );

    await user.tab(); // Focus the button
    await user.keyboard(' ');
    expect(mockOnClickExpand).toHaveBeenCalledTimes(1);
  });

  it('should not call onClickExpand when other keys are pressed', async () => {
    const user = userEvent.setup();
    render(
      <AltinnCollapsibleList
        open={true}
        onClickExpand={mockOnClickExpand}
        listHeader={<div>{listHeaderText}</div>}
      >
        <div>{childrenText}</div>
      </AltinnCollapsibleList>,
    );

    await user.tab(); // Focus the button
    await user.keyboard('A');
    expect(mockOnClickExpand).not.toHaveBeenCalled();
  });

  it('should render children in collapsed state when open is false', () => {
    render(
      <AltinnCollapsibleList
        open={false}
        onClickExpand={mockOnClickExpand}
        listHeader={<div>{listHeaderText}</div>}
      >
        <div>{childrenText}</div>
      </AltinnCollapsibleList>,
    );

    expect(screen.getByText(listHeaderText)).toBeInTheDocument();
    expect(screen.getByText(childrenText)).toBeInTheDocument();

    // Find the collapsible content and check its classes
    const collapsibleContent = screen.getByText(childrenText).closest('.collapsible-class');
    expect(collapsibleContent).toHaveClass('collapsible-closed-class');
  });

  it('should render complex list header content', () => {
    const complexHeader = (
      <div>
        <span data-testid='header-icon'>📁</span>
        <span data-testid='header-text'>Complex Header</span>
      </div>
    );

    render(
      <AltinnCollapsibleList
        open={true}
        onClickExpand={mockOnClickExpand}
        listHeader={complexHeader}
      >
        <div>{childrenText}</div>
      </AltinnCollapsibleList>,
    );

    expect(screen.getByTestId('header-icon')).toBeInTheDocument();
    expect(screen.getByTestId('header-text')).toBeInTheDocument();
    expect(screen.getByText('Complex Header')).toBeInTheDocument();
  });

  it('should have correct accessibility attributes', () => {
    render(
      <AltinnCollapsibleList
        open={true}
        onClickExpand={mockOnClickExpand}
        listHeader={<div>{listHeaderText}</div>}
      >
        <div>{childrenText}</div>
      </AltinnCollapsibleList>,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('tabIndex', '0');
  });
});
