import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StudioPaginatedContent, type StudioPaginatedContentProps } from './StudioPaginatedContent';

const navigationMock: StudioPaginatedContentProps['navigation'] = {
  canGoNext: true,
  canGoPrevious: true,
  onNext: jest.fn(),
  onPrevious: jest.fn(),
};

const buttonTextsMock: StudioPaginatedContentProps['buttonTexts'] = {
  previous: 'Previous',
  next: 'Next',
};

const defaultProps: StudioPaginatedContentProps = {
  totalPages: 5,
  currentPageNumber: 2,
  componentToRender: <div>Content</div>,
  buttonTexts: buttonTextsMock,
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

  it('disables the next button when canGoNext is false', () => {
    renderStudioPaginatedContent({
      navigation: { ...navigationMock, canGoNext: false },
    });

    expect(screen.getByText('Next')).toBeDisabled();
  });

  it('calls onPrevious when the previous button is clicked', () => {
    renderStudioPaginatedContent();

    fireEvent.click(screen.getByText('Previous'));
    expect(defaultProps.navigation.onPrevious).toHaveBeenCalled();
  });

  it('calls onNext when the next button is clicked', () => {
    renderStudioPaginatedContent();
    fireEvent.click(screen.getByText('Next'));
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
