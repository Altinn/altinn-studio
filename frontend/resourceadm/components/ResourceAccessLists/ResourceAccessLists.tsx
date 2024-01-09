import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Checkbox, Heading, Link as DigdirLink } from '@digdir/design-system-react';
import classes from './ResourceAccessLists.module.css';
import { useGetAccessListsQuery } from 'resourceadm/hooks/queries/useGetAccessListsQuery';
import { StudioSpinner } from '@studio/components';
import { useGetResourceAccessListsQuery } from 'resourceadm/hooks/queries/useGetResourceAccessListsQuery';
import { useAddResourceAccessListMutation } from 'resourceadm/hooks/mutations/useAddResourceAccessListMutation';
import { useRemoveResourceAccessListMutation } from 'resourceadm/hooks/mutations/useRemoveResourceAccessListMutation';
import { getResourcePageURL } from 'resourceadm/utils/urlUtils';
import { NewAccessListModal } from '../NewAccessListModal';
import { Resource } from 'app-shared/types/ResourceAdm';
import { useUrlParams } from 'resourceadm/hooks/useSelectedContext';

interface ResourceAccessListsProps {
  env: string;
  resourceData: Resource;
}

export const ResourceAccessLists = ({
  env,
  resourceData,
}: ResourceAccessListsProps): React.ReactNode => {
  const { t } = useTranslation();

  const { selectedContext, repo } = useUrlParams();
  const createAccessListModalRef = useRef<HTMLDialogElement>(null);

  const [selectedLists, setSelectedLists] = useState<string[]>([]);

  const {
    data: envListData,
    isLoading: isLoadingEnvListData,
    error: envListDataError,
  } = useGetAccessListsQuery(selectedContext, env);
  const {
    data: connectedLists,
    isLoading: isLoadingConnectedLists,
    error: connectedListsError,
  } = useGetResourceAccessListsQuery(selectedContext, resourceData.identifier, env);
  const { mutate: addResourceAccessList } = useAddResourceAccessListMutation(
    selectedContext,
    resourceData.identifier,
    env,
  );
  const { mutate: removeResourceAccessList } = useRemoveResourceAccessListMutation(
    selectedContext,
    resourceData.identifier,
    env,
  );

  useEffect(() => {
    if (connectedLists) {
      setSelectedLists(connectedLists.map((x) => x.accessListIdentifier));
    }
  }, [connectedLists]);

  const handleRemove = (listItemId: string) => {
    setSelectedLists((old) => old.filter((y) => y !== listItemId));
    removeResourceAccessList(listItemId);
  };

  const handleAdd = (listItemId: string) => {
    addResourceAccessList(listItemId);
    setSelectedLists((old) => [...old, listItemId]);
  };

  if (isLoadingEnvListData || isLoadingConnectedLists) {
    return <StudioSpinner spinnerText={t('general.loading')} />;
  }

  if (envListDataError || connectedListsError) {
    return <Alert severity='danger'>{t('resourceadm.listadmin_load_list_error')}</Alert>;
  }

  return (
    <div className={classes.resourceAccessListsWrapper}>
      <NewAccessListModal
        ref={createAccessListModalRef}
        org={selectedContext}
        env={env}
        navigateUrl={`${getResourcePageURL(
          selectedContext,
          repo,
          resourceData.identifier,
          'accesslists',
        )}/${env}/`}
        onClose={() => createAccessListModalRef.current?.close()}
      />
      <DigdirLink
        as={Link}
        to={getResourcePageURL(selectedContext, repo, resourceData.identifier, 'about')}
      >
        {t('general.back')}
      </DigdirLink>
      <Heading level={1} size='large'>
        {t('resourceadm.listadmin_resource_header', {
          resourceTitle: resourceData.title.nb,
          env: env.toUpperCase(),
        })}
      </Heading>
      <Checkbox.Group
        legend={t('resourceadm.listadmin_resource_list_checkbox_header')}
        size='medium'
        onChange={(newValues: string[]) => {
          if (selectedLists.length < newValues.length) {
            const addedListIdentifier = newValues[newValues.length - 1];
            handleAdd(addedListIdentifier);
          } else {
            const removedListIdentifier = selectedLists.find((x) => newValues.indexOf(x) === -1);
            handleRemove(removedListIdentifier);
          }
        }}
        value={selectedLists}
      >
        {envListData.map((list) => {
          return (
            <div key={list.identifier} className={classes.listCheckboxWrapper}>
              <Checkbox value={list.identifier}>{list.name}</Checkbox>
              <DigdirLink
                as={Link}
                to={`${getResourcePageURL(
                  selectedContext,
                  repo,
                  resourceData.identifier,
                  'accesslists',
                )}/${env}/${list.identifier}`}
              >
                {`(${t('general.edit')})`}
              </DigdirLink>
            </div>
          );
        })}
      </Checkbox.Group>
      <Button variant='secondary' onClick={() => createAccessListModalRef.current?.showModal()}>
        {t('resourceadm.listadmin_create_list')}
      </Button>
    </div>
  );
};
