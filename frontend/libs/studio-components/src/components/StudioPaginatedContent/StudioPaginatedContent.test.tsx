import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioPaginatedContent, type StudioPaginatedContentProps } from './StudioPaginatedContent';

const navigationMock: StudioPaginatedContentProps['navigation'] = {
  canGoNext: true,
  canGoPrevious: true,
  onNext: jest.fn(),
  onPrevious: jest.fn(),
};

const buttonTextsMock: StudioPaginatedContentProps['navigationButtonTexts'] = {
  previous: 'Previous',
  next: 'Next',
};

const defaultProps: StudioPaginatedContentProps = {
  totalPages: 5,
  currentPageNumber: 2,
  componentToRender: <div>Content</div>,
  navigationButtonTexts: buttonTextsMock,
  navigation: navigationMock,
};

describe('StudioPaginatedContent', () => {
  it('renders the componentToRender', () => {
    renderStudioPaginatedContent();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders the correct number of navigation circles', () => {
    renderStudioPaginatedContent();

    const circles = screen.getAllByRole('status');
    expect(circles.length).toBe(defaultProps.totalPages);
  });

  it('disables the previous button when canGoPrevious is false', () => {
    renderStudioPaginatedContent({
      navigation: { ...navigationMock, canGoPrevious: false },
    });

    expect(screen.getByText('Previous')).toBeDisabled();
  });

  it('enables the next button when canGoNext is undefined', () => {
    renderStudioPaginatedContent({
      navigation: { ...navigationMock, canGoNext: undefined },
    });

    expect(screen.getByText('Next')).not.toBeDisabled();
  });

  it('enables the previous button when canGoPrevious is undefined', () => {
    renderStudioPaginatedContent({
      navigation: { ...navigationMock, canGoPrevious: undefined },
    });

    expect(screen.getByText('Next')).not.toBeDisabled();
  });

  it('disables the next button when canGoNext is false', () => {
    renderStudioPaginatedContent({
      navigation: { ...navigationMock, canGoNext: false },
    });

    expect(screen.getByText('Next')).toBeDisabled();
  });

  it('calls onPrevious when the previous button is clicked', async () => {
    const user = userEvent.setup();
    renderStudioPaginatedContent();

    await user.click(screen.getByText('Previous'));
    expect(defaultProps.navigation.onPrevious).toHaveBeenCalled();
  });

  it('calls onNext when the next button is clicked', async () => {
    const user = userEvent.setup();
    renderStudioPaginatedContent();

    await user.click(screen.getByText('Next'));
    expect(defaultProps.navigation.onNext).toHaveBeenCalled();
  });

  it('highlights the correct navigation circle based on currentPageNumber', () => {
    renderStudioPaginatedContent();
    const activeCircles = screen
      .getAllByRole('status')
      .filter((circle) => circle.classList.contains('active'));
    expect(activeCircles.length).toBe(defaultProps.currentPageNumber + 1);
  });
});

const renderStudioPaginatedContent = (props: Partial<StudioPaginatedContentProps> = {}) => {
  return render(<StudioPaginatedContent {...defaultProps} {...props} />);
};
