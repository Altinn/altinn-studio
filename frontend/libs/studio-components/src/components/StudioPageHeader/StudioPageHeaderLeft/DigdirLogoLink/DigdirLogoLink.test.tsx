import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { DigdirLogoLink, type DigdirLogoLinkProps } from './DigdirLogoLink';
import { StudioPageHeaderContext } from '../../context';
import { type StudioPageHeaderContextProps } from '../../context/StudioPageHeaderContext';

describe('DigdirLogoLink', () => {
  afterEach(jest.clearAllMocks);

  it('should render the DigdirLogo with the correct link', () => {
    renderDigdirLogoLink({ providerProps: { variant: 'regular' } });

    const logoLink = screen.getByRole('link');
    expect(logoLink).toHaveAttribute('href', '/');
  });

  it('should render the title when showTitle is true', () => {
    renderDigdirLogoLink({ componentProps: { showTitle: true } });

    expect(screen.getByText(mockTitle)).toBeInTheDocument();
  });

  it('should not render the title when showTitle is false', () => {
    renderDigdirLogoLink({ componentProps: { showTitle: false } });

    expect(screen.queryByText(mockTitle)).not.toBeInTheDocument();
  });

  it('should apply the correct color based on the variant from context', () => {
    renderDigdirLogoLink({ providerProps: { variant: 'preview' } });

    const link = screen.getByRole('link');
    expect(link).toHaveClass('preview');
    expect(link).toHaveClass('light');
  });
});

const mockTitle: string = 'title';

const defaultProps: DigdirLogoLinkProps = {
  title: mockTitle,
  showTitle: false,
};

type Props = {
  componentProps: Partial<DigdirLogoLinkProps>;
  providerProps: Partial<StudioPageHeaderContextProps>;
};

const renderDigdirLogoLink = (props: Partial<Props> = {}): RenderResult => {
  const { componentProps, providerProps = { variant: 'regular' } } = props;

  return render(
    <StudioPageHeaderContext.Provider value={providerProps}>
      <DigdirLogoLink {...defaultProps} {...componentProps} />
    </StudioPageHeaderContext.Provider>,
  );
};
