import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioHeading, StudioHeadingProps } from './StudioHeading';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

const mockHeading: string = 'Test Heading';

describe('StudioHeading', () => {
  it('renders children correctly', () => {
    renderStudioHeading();
    expect(getHeading(mockHeading)).toBeInTheDocument();
  });

  it('applies default data-size correctly', () => {
    renderStudioHeading();
    expect(getHeading(mockHeading).getAttribute('data-size')).toBe('sm');
  });

  it('applies custom data-size correctly', () => {
    renderStudioHeading({ 'data-size': 'lg' });
    expect(getHeading(mockHeading).getAttribute('data-size')).toBe('lg');
  });

  it('applies custom data-size correctly', () => {
    renderStudioHeading({ level: 1 });
    expect(getHeading(mockHeading, 1)).toBeInTheDocument();
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderStudioHeading({ className }));
  });
});

const renderStudioHeading = (props: Partial<StudioHeadingProps> = {}) => {
  return render(<StudioHeading {...props}>{mockHeading}</StudioHeading>);
};

const getHeading = (name: string, level: number = 2) =>
  screen.getByRole('heading', { name, level }) as HTMLElement;
