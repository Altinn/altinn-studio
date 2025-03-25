import React from 'react';
import { screen } from '@testing-library/react';
import { LeftContent, type LeftContentProps, SubHeader, type SubHeaderProps } from './SubHeader';
import { renderWithProviders } from '../../../test/mocks';
import { PreviewContext } from '../../../contexts/PreviewContext';
import { pageHeaderContextMock, previewContextMock } from '../../../test/headerMocks';
import { PageHeaderContext } from '../../../contexts/PageHeaderContext';
import { app, org } from '@studio/testing/testids';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { SettingsModalContextProvider } from '../../../contexts/SettingsModalContext';
import type { PageHeaderContextProps } from '../../../contexts/PageHeaderContext';
import { RepositoryType } from 'app-shared/types/global';
import userEvent from '@testing-library/user-event';

const defaultProps: SubHeaderProps = {
  hasRepoError: false,
};

describe('SubHeader', () => {
  afterEach(jest.clearAllMocks);

  it('should render the GiteaHeader with left content if repository type is not DataModels', () => {
    renderSubHeader();

    expect(
      screen.getByRole('button', { name: textMock('sync_header.gitea_menu') }),
    ).toBeInTheDocument();
  });

  it('should render the left content if repository type is not DataModels', () => {
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useParams: () => ({
        org,
        app,
      }),
    }));
    renderSubHeader();

    expect(screen.getByRole('link', { name: textMock('top_menu.preview') })).toBeInTheDocument();
  });

  it('should render the left content with returnTo button if returnTo is set', () => {
    renderSubHeader({
      pageHeaderContextProps: {
        returnTo: 'ui-editor',
      },
    });
    expect(
      screen.getByRole('button', { name: textMock('header.returnTo.ui-editor') }),
    ).toBeInTheDocument();
  });
});

describe('LeftContent', () => {
  it('should render the returnTo button if returnTo is set', () => {
    renderLeftContent({
      pageHeaderContextProps: {
        returnTo: 'ui-editor',
      },
    });

    expect(
      screen.getByRole('button', { name: textMock('header.returnTo.ui-editor') }),
    ).toBeInTheDocument();
  });

  it('should render the SubHeaderLeftContent if returnTo is not set', () => {
    renderLeftContent();

    expect(
      screen.getByRole('button', { name: textMock('sync_header.settings') }),
    ).toBeInTheDocument();
  });

  it('should return null if repository type is DataModels', () => {
    renderLeftContent({
      componentProps: {
        repositoryType: RepositoryType.DataModels,
      },
    });

    expect(
      screen.queryByRole('button', { name: textMock('sync_header.settings') }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: textMock('top_menu.preview') }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: textMock('header.returnTo.ui-editor') }),
    ).not.toBeInTheDocument();
  });

  it('should call the navigate function when the returnTo button is clicked', async () => {
    const navigate = jest
      .spyOn(require('react-router-dom'), 'useNavigate')
      .mockReturnValue(jest.fn());
    renderLeftContent({
      pageHeaderContextProps: {
        returnTo: 'ui-editor',
      },
    });

    const user = userEvent.setup();

    const returnToButton = screen.getByRole('button', {
      name: textMock('header.returnTo.ui-editor'),
    });
    expect(returnToButton).toBeInTheDocument();
    await user.click(returnToButton);
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});

type Props<T> = {
  componentProps?: Partial<T>;
  pageHeaderContextProps?: Partial<PageHeaderContextProps>;
};

const renderSubHeader = ({
  componentProps,
  pageHeaderContextProps,
}: Partial<Props<SubHeaderProps>> = {}) => {
  return renderWithProviders()(
    <PageHeaderContext.Provider value={{ ...pageHeaderContextMock, ...pageHeaderContextProps }}>
      <SettingsModalContextProvider>
        <PreviewContext.Provider value={previewContextMock}>
          <SubHeader {...defaultProps} {...componentProps} />
        </PreviewContext.Provider>
      </SettingsModalContextProvider>
    </PageHeaderContext.Provider>,
  );
};

const renderLeftContent = ({
  componentProps,
  pageHeaderContextProps,
}: Partial<Props<LeftContentProps>> = {}) => {
  const props: LeftContentProps = {
    repositoryType: RepositoryType.App,
  };
  return renderWithProviders()(
    <PageHeaderContext.Provider value={{ ...pageHeaderContextMock, ...pageHeaderContextProps }}>
      <SettingsModalContextProvider>
        <LeftContent {...props} {...componentProps} />
      </SettingsModalContextProvider>
    </PageHeaderContext.Provider>,
  );
};
