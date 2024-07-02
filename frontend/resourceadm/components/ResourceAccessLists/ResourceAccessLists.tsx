import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Checkbox, Heading, Link as DigdirLink } from '@digdir/design-system-react';
import classes from './ResourceAccessLists.module.css';
import { StudioSpinner, StudioButton } from '@studio/components';
import { PencilWritingIcon, PlusIcon } from '@studio/icons';
import { useGetResourceAccessListsQuery } from '../../hooks/queries/useGetResourceAccessListsQuery';
import { useAddResourceAccessListMutation } from '../../hooks/mutations/useAddResourceAccessListMutation';
import { useRemoveResourceAccessListMutation } from '../../hooks/mutations/useRemoveResourceAccessListMutation';
import { getResourcePageURL } from '../../utils/urlUtils';
import { NewAccessListModal } from '../NewAccessListModal';
import type { Resource, ResourceError } from 'app-shared/types/ResourceAdm';
import { useUrlParams } from '../../hooks/useUrlParams';
import type { EnvId } from '../../utils/resourceUtils';
import { AccessListErrorMessage } from '../AccessListErrorMessage';

export interface ResourceAccessListsProps {
  env: EnvId;
  resourceData: Resource;
}

export const ResourceAccessLists = ({
  env,
  resourceData,
}: ResourceAccessListsProps): React.JSX.Element => {
  const { t } = useTranslation();

  const { org, app } = useUrlParams();
  const createAccessListModalRef = useRef<HTMLDialogElement>(null);

  const [selectedLists, setSelectedLists] = useState<string[]>([]);

  const {
    data: accessLists,
    isLoading: isLoadingAccessLists,
    error: accessListsError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useGetResourceAccessListsQuery(org, resourceData.identifier, env);
  const { mutate: addResourceAccessList } = useAddResourceAccessListMutation(
    org,
    resourceData.identifier,
    env,
  );
  const { mutate: removeResourceAccessList } = useRemoveResourceAccessListMutation(
    org,
    resourceData.identifier,
    env,
  );

  useEffect(() => {
    if (accessLists) {
      const connectedListIds = accessLists.pages
        .filter((x) =>
          x.resourceConnections?.some((y) => y.resourceIdentifier === resourceData.identifier),
        )
        .map((x) => x.identifier);
      setSelectedLists(connectedListIds);
    }
  }, [accessLists, resourceData.identifier]);

  const handleRemove = (listItemId: string) => {
    setSelectedLists((old) => old.filter((y) => y !== listItemId));
    removeResourceAccessList(listItemId);
  };

  const handleAdd = (listItemId: string) => {
    addResourceAccessList(listItemId);
    setSelectedLists((old) => [...old, listItemId]);
  };

  if (isLoadingAccessLists) {
    return <StudioSpinner showSpinnerTitle spinnerTitle={t('resourceadm.loading_lists')} />;
  }

  if (accessListsError) {
    return <AccessListErrorMessage error={accessListsError as ResourceError} env={env} />;
  }

  return (
    <div className={classes.resourceAccessListsWrapper}>
      <NewAccessListModal
        ref={createAccessListModalRef}
        org={org}
        env={env}
        navigateUrl={`${getResourcePageURL(
          org,
          app,
          resourceData.identifier,
          'accesslists',
        )}/${env}/`}
        onClose={() => createAccessListModalRef.current?.close()}
      />
      <DigdirLink asChild>
        <Link to={getResourcePageURL(org, app, resourceData.identifier, 'about')}>
          {t('general.back')}
        </Link>
      </DigdirLink>
      <Heading level={1} size='large'>
        {t('resourceadm.listadmin_resource_header', {
          resourceTitle: resourceData.title.nb,
          env: env.toUpperCase(),
        })}
      </Heading>
      <Heading level={2} size='xsmall'>
        {t('resourceadm.listadmin_resource_list_checkbox_header')}
      </Heading>
      <div className={classes.listCheckboxWrapper}>
        {accessLists?.pages.map((list) => {
          return (
            <div key={list.identifier} className={classes.listCheckboxItem}>
              <Checkbox
                value={list.identifier}
                checked={selectedLists.indexOf(list.identifier) > -1}
                onChange={(event) => {
                  if (event.target.checked) {
                    handleAdd(list.identifier);
                  } else {
                    handleRemove(list.identifier);
                  }
                }}
              >
                {list.name}
              </Checkbox>
              <StudioButton
                size='small'
                variant='tertiary'
                asChild
                aria-label={`${t('resourceadm.listadmin_edit_list')} ${list.name}`}
              >
                <Link
                  to={`${getResourcePageURL(
                    org,
                    app,
                    resourceData.identifier,
                    'accesslists',
                  )}/${env}/${list.identifier}`}
                >
                  {t('resourceadm.listadmin_edit_list')}
                  <PencilWritingIcon />
                </Link>
              </StudioButton>
            </div>
          );
        })}
        {hasNextPage && (
          <StudioButton
            disabled={isFetchingNextPage}
            size='small'
            variant='tertiary'
            onClick={() => fetchNextPage()}
          >
            {t('resourceadm.listadmin_load_more', {
              unit: t('resourceadm.listadmin_list_unit'),
            })}
          </StudioButton>
        )}
      </div>
      <StudioButton
        variant='tertiary'
        size='small'
        icon={<PlusIcon />}
        iconPlacement='left'
        onClick={() => createAccessListModalRef.current?.showModal()}
      >
        {t('resourceadm.listadmin_create_list')}
      </StudioButton>
    </div>
  );
};
