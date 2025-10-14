import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioPageHeader, type StudioPageHeaderProps } from './StudioPageHeader';

describe('StudioPageHeader', () => {
  it('should render the children passed to it', () => {
    const childText = 'Test Child';
    renderStudioPageHeader({ children: <div>{childText}</div> });

    expect(screen.getByText(childText)).toBeInTheDocument();
  });

  test('the root container should have role banner', () => {
    renderStudioPageHeader({ children: <div>Test Child</div> });

    const banner = screen.getByRole('banner');
    expect(banner).toBeInTheDocument();
  });
});

const renderStudioPageHeader = (
  props: Partial<StudioPageHeaderProps> = {},
): ReturnType<typeof render> => {
  const { children, variant = 'regular' } = props;

  return render(
    <StudioPageHeader variant={variant}>{children ?? <div>Default Child</div>}</StudioPageHeader>,
  );
};
