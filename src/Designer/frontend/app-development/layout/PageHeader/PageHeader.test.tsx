import React from 'react';
import { screen } from '@testing-library/react';
import { PageHeader, type PageHeaderProps } from './PageHeader';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { PageHeaderContext } from '../../contexts/PageHeaderContext';
import { app } from '@studio/testing/testids';
import { type PageHeaderContextProps } from '../../contexts/PageHeaderContext/PageHeaderContext';
import { pageHeaderContextMock, previewContextMock } from '../../test/headerMocks';
import { PreviewContext } from '../../contexts/PreviewContext';
import { renderWithProviders } from '../../test/mocks';
import { useMediaQuery } from '@studio/components-legacy/hooks/useMediaQuery';

jest.mock('@studio/components-legacy/hooks/useMediaQuery');

const defaultProps: PageHeaderProps = {
  showSubMenu: true,
  isRepoError: false,
};

describe('PageHeader', () => {
  afterEach(() => jest.clearAllMocks());

  it('should render the app title when on a large screen', () => {
    renderPageHeader();

    expect(
      screen.queryByRole('button', { name: textMock('top_menu.menu') }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(app)).toBeInTheDocument();
  });

  it('should render the small header menu on a small screen', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(true);

    renderPageHeader();

    expect(screen.getByRole('button', { name: textMock('top_menu.menu') })).toBeInTheDocument();
    expect(screen.queryByText(app)).not.toBeInTheDocument();
  });

  it('should render the subheader when showSubMenu is true', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(false);
    renderPageHeader();

    expect(screen.getByRole('link', { name: textMock('top_menu.preview') })).toBeInTheDocument();
  });

  it('should not render the subheader when showSubMenu is fasle', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(false);
    renderPageHeader({ componentProps: { showSubMenu: false } });

    expect(
      screen.queryByRole('link', { name: textMock('top_menu.preview') }),
    ).not.toBeInTheDocument();
  });

  it('should not render the subheader when showSubMenu is false and isRepoError is true', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(false);
    renderPageHeader({ componentProps: { isRepoError: true } });

    expect(
      screen.queryByRole('link', { name: textMock('top_menu.preview') }),
    ).not.toBeInTheDocument();
  });
});

type Props = {
  componentProps: Partial<PageHeaderProps>;
  contextProps: Partial<PageHeaderContextProps>;
};

const renderPageHeader = (props: Partial<Props> = {}) => {
  const { componentProps, contextProps } = props;
  return renderWithProviders()(
    <PageHeaderContext.Provider value={{ ...pageHeaderContextMock, ...contextProps }}>
      <PreviewContext.Provider value={previewContextMock}>
        <PageHeader {...defaultProps} {...componentProps} />,
      </PreviewContext.Provider>
    </PageHeaderContext.Provider>,
  );
};
