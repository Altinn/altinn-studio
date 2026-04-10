import { RepoList } from '../RepoList';
import { getReposLabel } from '../../utils/repoUtils';
import { getUidFilter } from '../../utils/filterUtils';
import { useAugmentReposWithStarred } from '../../hooks/useAugmentReposWithStarred';
import { Trans, useTranslation } from 'react-i18next';
import type { User } from 'app-shared/types/Repository';
import type { Organization } from 'app-shared/types/Organization';
import { useSearchReposQuery } from 'dashboard/hooks/queries/useSearchReposQuery';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';
import { Heading, Link } from '@digdir/designsystemet-react';
import { useStarredReposQuery } from 'dashboard/hooks/queries';
import { DATA_MODEL_REPO_IDENTIFIER } from '../../constants';
import { TableSortStorageKey } from '../../types/TableSortStorageKey';
import { SafeErrorView } from '../SafeErrorView';
import classes from './DataModelsRepoList.module.css';
import { ErrorBoundary } from 'react-error-boundary';

type DataModelsReposListProps = {
  user: User;
  organizations: Organization[];
};
export const DataModelsReposList = ({ user, organizations }: DataModelsReposListProps) => {
  const selectedContext = useSelectedContext();
  const { t } = useTranslation();

  const uid = getUidFilter({
    selectedContext,
    userId: user.id,
    organizations,
  });

  const { data: starredRepos = [], isPending: hasPendingStarredRepos } = useStarredReposQuery();
  const { data: dataModelRepos, isPending: hasPendingDataModels } = useSearchReposQuery({
    uid: uid as number,
    keyword: DATA_MODEL_REPO_IDENTIFIER,
  });

  const dataModelsIncludingStarredData = useAugmentReposWithStarred({
    repos: dataModelRepos?.data,
    starredRepos,
  });

  if (!dataModelsIncludingStarredData.length) {
    return null;
  }

  return (
    <div className={classes.container}>
      <ErrorBoundary
        fallback={
          <SafeErrorView
            heading={t('dashboard.all_data_models')}
            title={t('dashboard.view_data_models_error_title')}
            message={
              <Trans
                i18nKey={'dashboard.view_table_error_message'}
                components={{
                  a: <Link href='/info/contact'> </Link>,
                }}
              ></Trans>
            }
          />
        }
      >
        <Heading level={2} size='small' spacing>
          {getReposLabel({ selectedContext, orgs: organizations, t, isDataModelsRepo: true })}
        </Heading>
        <RepoList
          repos={dataModelsIncludingStarredData}
          isLoading={hasPendingDataModels || hasPendingStarredRepos}
          sortStorageKey={TableSortStorageKey.DataModelRepos}
        />
      </ErrorBoundary>
    </div>
  );
};
