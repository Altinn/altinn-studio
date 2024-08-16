import React, { useState } from 'react';
import classes from './Dashboard.module.css';
import cn from 'classnames';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Textfield } from '@digdir/designsystemet-react';
import { StudioButton } from '@studio/components';
import { XMarkIcon } from '@studio/icons';
import { useDebounce } from '@studio/hooks';
import { CenterContainer } from '../../components/CenterContainer';
import { DataModelsReposList } from '../../components/DataModelsRepoList';
import { OrgReposList } from '../../components/OrgRepoList';
import { SearchResultReposList } from '../../components/SearchResultReposList';
import { FavoriteReposList } from '../../components/FavoriteReposList';
import { Footer } from '../../components/Footer';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from 'react-error-boundary';
import type { User } from 'app-shared/types/Repository';
import type { Organization } from 'app-shared/types/Organization';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';
import { ResourcesRepoList } from 'dashboard/components/ResourcesRepoList/ResourcesRepoList';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import { SafeErrorView } from '../../components/SafeErrorView';

type DashboardProps = {
  user: User;
  organizations: Organization[];
  disableDebounce?: boolean;
};

export const Dashboard = ({ user, organizations, disableDebounce }: DashboardProps) => {
  const { t } = useTranslation();
  const selectedContext = useSelectedContext();
  const [searchText, setSearchText] = useState('');
  const [isNewLinkFocused, setIsNewLinkFocused] = useState(false);
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const { debounce } = useDebounce({ debounceTimeInMs: disableDebounce ? 1 : 500 });
  debounce(() => setDebouncedSearchText(searchText));

  const handleChangeSearch = (event: ChangeEvent<HTMLInputElement>) =>
    setSearchText(event.target.value);

  const handleKeyDown = (event: KeyboardEvent) => event.code === 'Escape' && setSearchText('');
  const handleClearSearch = () => setSearchText('');
  const handleNewLinkFocus = () => setIsNewLinkFocused(true);
  const handleNewLinkFocusOut = () => setIsNewLinkFocused(false);

  const shouldDisplayResources =
    selectedContext !== SelectedContextType.All && selectedContext !== SelectedContextType.Self;

  return (
    <>
      <CenterContainer>
        <div className={classes.createServiceContainer}>
          <div className={classes.topBar}>
            <div className={classes.searchFieldContainer}>
              <Textfield
                label={t('dashboard.search')}
                value={searchText}
                onChange={handleChangeSearch}
                onKeyDown={handleKeyDown}
              />
              {searchText && (
                <StudioButton
                  className={classes.clearSearchButton}
                  aria-label={t('dashboard.clear_search')}
                  onClick={handleClearSearch}
                  icon={<XMarkIcon />}
                  variant='tertiary'
                />
              )}
            </div>
            <Link
              to={'/' + selectedContext + '/new'}
              className={classes.newLink}
              onMouseEnter={handleNewLinkFocus}
              onMouseLeave={handleNewLinkFocusOut}
            >
              <span>{t('dashboard.new_service')}</span>
              <i
                className={cn('fa', classes.plusIcon, {
                  'fa-circle-plus': isNewLinkFocused,
                  'fa-circle-plus-outline': !isNewLinkFocused,
                })}
              />
            </Link>
          </div>

          {debouncedSearchText ? (
            <SearchResultReposList searchValue={debouncedSearchText} />
          ) : (
            <>
              <ErrorBoundary
                fallback={
                  <SafeErrorView
                    heading={t('dashboard.favourites')}
                    title={t('dashboard.view_favorites_error_title')}
                    message={t('dashboard.view_table_error_message')}
                  />
                }
              >
                <FavoriteReposList />
              </ErrorBoundary>
              <div>
                <ErrorBoundary
                  fallback={
                    <SafeErrorView
                      heading={t('dashboard.all_apps')}
                      title={t('dashboard.view_apps_error_title')}
                      message={t('dashboard.view_table_error_message')}
                    />
                  }
                >
                  <OrgReposList user={user} organizations={organizations} />
                </ErrorBoundary>
              </div>
              <ErrorBoundary
                fallback={
                  <SafeErrorView
                    heading={t('dashboard.all_data_models')}
                    title={t('dashboard.view_data_models_error_title')}
                    message={t('dashboard.view_table_error_message')}
                  />
                }
              >
                <DataModelsReposList user={user} organizations={organizations} />
              </ErrorBoundary>
              {shouldDisplayResources && (
                <ErrorBoundary
                  fallback={
                    <SafeErrorView
                      heading={t('dashboard.all_resources')}
                      title={t('dashboard.view_resources_error_title')}
                      message={t('dashboard.view_table_error_message')}
                    />
                  }
                >
                  <ResourcesRepoList user={user} organizations={organizations} />
                </ErrorBoundary>
              )}
            </>
          )}
        </div>
      </CenterContainer>
      <Footer />
    </>
  );
};
