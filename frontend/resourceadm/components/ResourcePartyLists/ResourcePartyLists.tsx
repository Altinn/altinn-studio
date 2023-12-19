import React, { useEffect, useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Checkbox, Heading, Link as DigdirLink } from '@digdir/design-system-react';
import classes from './ResourcePartyLists.module.css';
import { useGetPartyListsQuery } from 'resourceadm/hooks/queries/useGetPartyLists';
import { StudioSpinner } from '@studio/components';
import { useGetResourcePartyListsQuery } from 'resourceadm/hooks/queries/useGetResourcePartyLists';
import { useAddResourcePartyListMutation } from 'resourceadm/hooks/mutations/useAddResourcePartyListMutation';
import { useRemoveResourcePartyListMutation } from 'resourceadm/hooks/mutations/useRemoveResourcePartyListMutation';
import { getResourcePageURL } from 'resourceadm/utils/urlUtils';
import { NewPartyListModal } from '../NewPartyListModal/NewPartyListModal';
import { Resource } from 'app-shared/types/ResourceAdm';

interface ResourcePartyListsProps {
  env: string;
  resourceData: Resource;
}

export const ResourcePartyLists = ({
  env,
  resourceData,
}: ResourcePartyListsProps): React.ReactNode => {
  const { t } = useTranslation();

  const { selectedContext } = useParams();
  const repo = `${selectedContext}-resources`;
  const navigate = useNavigate();
  const createPartyListModalRef = useRef<HTMLDialogElement>(null);

  const [selectedLists, setSelectedLists] = useState<string[]>([]);

  const {
    data: envListData,
    isLoading: isLoadingEnvListData,
    error: envListDataError,
  } = useGetPartyListsQuery(selectedContext, env);
  const {
    data: connectedLists,
    isLoading: isLoadingConnectedLists,
    error: connectedListsError,
  } = useGetResourcePartyListsQuery(selectedContext, resourceData.identifier, env);
  const { mutate: addResourcePartyList } = useAddResourcePartyListMutation(
    selectedContext,
    resourceData.identifier,
    env,
  );
  const { mutate: removeResourcePartyList } = useRemoveResourcePartyListMutation(
    selectedContext,
    resourceData.identifier,
    env,
  );

  useEffect(() => {
    if (connectedLists) {
      setSelectedLists(connectedLists.map((x) => x.partyListIdentifier));
    }
  }, [connectedLists]);

  const handleRemove = (listItemId: string) => {
    setSelectedLists((old) => old.filter((y) => y !== listItemId));
    removeResourcePartyList(listItemId);
  };

  const handleAdd = (listItemId: string) => {
    addResourcePartyList(listItemId);
    setSelectedLists((old) => [...old, listItemId]);
  };

  if (isLoadingEnvListData || isLoadingConnectedLists) {
    return <StudioSpinner spinnerText={t('general.loading')} />;
  }

  if (envListDataError || connectedListsError) {
    return <Alert severity='danger'>{t('resourceadm.listadmin_load_list_error')}</Alert>;
  }

  return (
    <div className={classes.resourcePartyListsWrapper}>
      <NewPartyListModal
        ref={createPartyListModalRef}
        org={selectedContext}
        env={env}
        onClose={() => createPartyListModalRef.current?.close()}
        onPartyListCreated={(identifier: string) => {
          createPartyListModalRef.current?.close();
          navigate(
            `${getResourcePageURL(
              selectedContext,
              repo,
              resourceData.identifier,
              'partylists',
            )}/${env}/${identifier}`,
          );
        }}
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
        size='small'
        onChange={(newValues: string[]) => {
          if (selectedLists.length < newValues.length) {
            // list was added
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
                  'partylists',
                )}/${env}/${list.identifier}`}
              >
                {`(${t('general.edit')})`}
              </DigdirLink>
            </div>
          );
        })}
      </Checkbox.Group>
      <Button variant='secondary' onClick={() => createPartyListModalRef.current?.showModal()}>
        {t('resourceadm.listadmin_create_list')}
      </Button>
    </div>
  );
};
