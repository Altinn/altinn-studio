import React from 'react';
import { render, screen } from '@testing-library/react';
import type { StudioBreadcrumbsProps } from './StudioBreadcrumbs';
import { defaultAriaLabel } from './StudioBreadcrumbs';
import {
  StudioBreadcrumbs,
  StudioBreadcrumbsItem,
  StudioBreadcrumbsLink,
  StudioBreadcrumbsList,
} from './';

// Test data
const customAriaLabel = 'Custom aria label';

const renderWithRoot = (props?: StudioBreadcrumbsProps) =>
  render(
    <StudioBreadcrumbs {...props}>
      <StudioBreadcrumbs.Link href='#' aria-label='Tilbake til Nivå 3'>
        Nivå 3
      </StudioBreadcrumbs.Link>
      <StudioBreadcrumbs.List>
        <StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Link href='#'>Nivå 1</StudioBreadcrumbs.Link>
        </StudioBreadcrumbs.Item>
        <StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Link href='#'>Nivå 2</StudioBreadcrumbs.Link>
        </StudioBreadcrumbs.Item>
        <StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Link href='#'>Nivå 3</StudioBreadcrumbs.Link>
        </StudioBreadcrumbs.Item>
        <StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Link href='#'>Nivå 4</StudioBreadcrumbs.Link>
        </StudioBreadcrumbs.Item>
      </StudioBreadcrumbs.List>
    </StudioBreadcrumbs>,
  );

describe('StudioBreadcrumbs', () => {
  it('should render with a default aria label', () => {
    renderWithRoot();

    const component = screen.getByRole('navigation');

    expect(component).toHaveAttribute('aria-label', defaultAriaLabel);
  });

  it('should render with a custom aria label', () => {
    renderWithRoot({ 'aria-label': customAriaLabel });

    const component = screen.getByRole('navigation');

    expect(component).toHaveAttribute('aria-label', customAriaLabel);
  });

  it('should export StudioBreadcrumbsList, StudioBreadcrumbsItem, and StudioBreadcrumbsLink', () => {
    expect(StudioBreadcrumbsList).toBeDefined();
    expect(StudioBreadcrumbsItem).toBeDefined();
    expect(StudioBreadcrumbsLink).toBeDefined();
  });
});

describe('StudioBreadcrumbs.List', () => {
  it('should render with aria-current on last item', () => {
    renderWithRoot();
    const links = screen.getAllByRole('link');
    expect(links.at(0)).not.toHaveAttribute('aria-current', 'page');
    expect(links.at(1)).not.toHaveAttribute('aria-current', 'page');
    expect(links.at(2)).not.toHaveAttribute('aria-current', 'page');
    expect(links.at(-1)).toHaveAttribute('aria-current', 'page');
  });

  it('should move aria-current to item when re-rendering', () => {
    renderWithRoot();
    const links = screen.getAllByRole('link');
    expect(links.at(-1)).toHaveAttribute('aria-current', 'page');

    // Re-render with additional level
    render(
      <StudioBreadcrumbs aria-label='Du er her:'>
        <StudioBreadcrumbs.Link href='#' aria-label='Tilbake til Nivå 3'>
          Nivå 3
        </StudioBreadcrumbs.Link>
        <StudioBreadcrumbs.List>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link href='#'>Nivå 1</StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link href='#'>Nivå 2</StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link href='#'>Nivå 3</StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link href='#'>Nivå 4</StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link href='#'>Nivå 5</StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
        </StudioBreadcrumbs.List>
      </StudioBreadcrumbs>,
    );

    expect(links.at(-2)).not.toHaveAttribute('aria-current', 'page');
    expect(links.at(-1)).toHaveAttribute('aria-current', 'page');
  });
});
