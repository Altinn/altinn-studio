import React from 'react';
import { screen } from '@testing-library/react';
import { SubHeader, type SubHeaderProps } from './SubHeader';
import { renderWithProviders } from '../../../test/mocks';
import { PreviewContext } from '../../../contexts/PreviewContext';
import { pageHeaderContextMock, previewContextMock } from '../../../test/headerMocks';
import { PageHeaderContext } from '../../../contexts/PageHeaderContext';
import { app, org } from '@studio/testing/testids';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { SettingsModalContextProvider } from '../../../contexts/SettingsModalContext';
import type { PageHeaderContextProps } from '../../../contexts/PageHeaderContext';

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

  it('should not render the left content if repository type is DataModels', () => {
    renderSubHeader();

    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useParams: () => ({
        org: `${org}-datamodels`,
        app,
      }),
    }));

    expect(
      screen.queryByRole('button', { name: textMock('top_menu.preview') }),
    ).not.toBeInTheDocument();
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

type Props = {
  componentProps?: Partial<SubHeaderProps>;
  pageHeaderContextProps?: Partial<PageHeaderContextProps>;
};

const renderSubHeader = ({ componentProps, pageHeaderContextProps }: Partial<Props> = {}) => {
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
