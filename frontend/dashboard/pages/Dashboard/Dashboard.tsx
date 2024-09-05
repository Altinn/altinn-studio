import React, { useState } from 'react';
import classes from './Dashboard.module.css';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Textfield, Link } from '@digdir/designsystemet-react';
import { StudioButton } from '@studio/components';
import { XMarkIcon, PlusCircleIcon, PlusCircleFillIcon } from '@studio/icons';
import { useDebounce } from '@studio/hooks';
import { CenterContainer } from '../../components/CenterContainer';
import { DataModelsReposList } from '../../components/DataModelsRepoList';
import { OrgReposList } from '../../components/OrgRepoList';
import { SearchResultReposList } from '../../components/SearchResultReposList';
import { FavoriteReposList } from '../../components/FavoriteReposList';
import { Footer } from '../../components/Footer';
import { Trans, useTranslation } from 'react-i18next';
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
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const { debounce } = useDebounce({ debounceTimeInMs: disableDebounce ? 1 : 500 });
  debounce(() => setDebouncedSearchText(searchText));

  const handleChangeSearch = (event: ChangeEvent<HTMLInputElement>) =>
    setSearchText(event.target.value);

  const handleKeyDown = (event: KeyboardEvent) => event.code === 'Escape' && setSearchText('');
  const handleClearSearch = () => setSearchText('');

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
            <Link href={'/dashboard/' + selectedContext + '/new'} className={classes.newLink}>
              <span>{t('dashboard.new_service')}</span>
              <PlusCircleFillIcon className={classes.plusFillIcon} />
              <PlusCircleIcon className={classes.plusIcon} />
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
                    message={
                      <Trans
                        i18nKey={'dashboard.view_table_error_message'}
                        components={{
                          a: <Link href='/contact'> </Link>,
                        }}
                      ></Trans>
                    }
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
                      message={
                        <Trans
                          i18nKey={'dashboard.view_table_error_message'}
                          components={{
                            a: <Link href='/contact'> </Link>,
                          }}
                        ></Trans>
                      }
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
                    message={
                      <Trans
                        i18nKey={'dashboard.view_table_error_message'}
                        components={{
                          a: <Link href='/contact'> </Link>,
                        }}
                      ></Trans>
                    }
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
                      message={
                        <Trans
                          i18nKey={'dashboard.view_table_error_message'}
                          components={{
                            a: <Link href='/contact'> </Link>,
                          }}
                        ></Trans>
                      }
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
