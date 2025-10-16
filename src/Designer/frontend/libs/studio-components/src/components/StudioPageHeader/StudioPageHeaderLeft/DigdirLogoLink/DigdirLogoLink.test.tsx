import React from 'react';
import { render, screen } from '@testing-library/react';
import { DigdirLogoLink, type DigdirLogoLinkProps } from './DigdirLogoLink';
import { StudioPageHeaderContext } from '../../context';
import { type StudioPageHeaderContextProps } from '../../context/StudioPageHeaderContext';

describe('DigdirLogoLink', () => {
  afterEach(jest.clearAllMocks);

  it('should render the DigdirLogo', () => {
    renderDigdirLogoLink({ providerProps: { variant: 'regular' } });
    const logo = screen.getByRole('img', { name: 'Altinn logo' });
    expect(logo).toBeInTheDocument();
  });

  it('should render the title when showTitle is true', () => {
    renderDigdirLogoLink({ componentProps: { showTitle: true } });

    expect(screen.getByText(mockTitle)).toBeInTheDocument();
  });

  it('should not render the title when showTitle is false', () => {
    renderDigdirLogoLink({ componentProps: { showTitle: false } });

    expect(screen.queryByText(mockTitle)).not.toBeInTheDocument();
  });

  it('should render the logo regardless of variant from context', () => {
    renderDigdirLogoLink({ providerProps: { variant: 'preview' } });
    const logo = screen.getByRole('img', { name: 'Altinn logo' });
    expect(logo).toBeInTheDocument();
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

const renderDigdirLogoLink = (props: Partial<Props> = {}): ReturnType<typeof render> => {
  const { componentProps, providerProps = { variant: 'regular' } } = props;

  return render(
    <StudioPageHeaderContext.Provider value={providerProps}>
      <DigdirLogoLink {...defaultProps} {...componentProps} />
    </StudioPageHeaderContext.Provider>,
  );
};
