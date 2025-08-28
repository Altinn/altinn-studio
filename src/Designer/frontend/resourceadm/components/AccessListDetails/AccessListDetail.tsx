import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import classes from './AccessListDetail.module.css';
import type { AccessList, ResourceError } from 'app-shared/types/ResourceAdm';
import { useEditAccessListMutation } from '../../hooks/mutations/useEditAccessListMutation';
import { useDeleteAccessListMutation } from '../../hooks/mutations/useDeleteAccessListMutation';
import { AccessListMembers } from '../AccessListMembers';
import { TrashIcon } from '@studio/icons';
import {
  StudioButton,
  StudioHeading,
  StudioLink,
  StudioTextfield,
  StudioDialog,
} from '@studio/components';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { AccessListPreconditionFailedToast } from '../AccessListPreconditionFailedToast';
import { ResourceAdmDialogContent } from '../ResourceAdmDialogContent/ResourceAdmDialogContent';

export interface AccessListDetailProps {
  org: string;
  env: string;
  list: AccessList;
  backUrl: string;
}

export const AccessListDetail = ({
  org,
  env,
  list,
  backUrl,
}: AccessListDetailProps): React.JSX.Element => {
  const { t } = useTranslation();

  const deleteWarningModalRef = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();

  const [latestEtag, setLatestEtag] = useState<string>(list.etag || '');
  const [listName, setListName] = useState<string>(list.name || '');
  const [listDescription, setListDescription] = useState<string>(list.description || '');

  const { mutate: editAccessList } = useEditAccessListMutation(org, list.identifier, env);
  const { mutate: deleteAccessList, isPending: isDeletingAccessList } = useDeleteAccessListMutation(
    org,
    list.identifier,
    env,
  );

  const checkForEtagVersionError = (error: Error): void => {
    if ((error as ResourceError).response.status === ServerCodes.PreconditionFailed) {
      toast.error(<AccessListPreconditionFailedToast />);
    }
  };

  // change list name, description and possibly other properties
  const handleSave = (accessList: AccessList): void => {
    editAccessList(
      { ...accessList, etag: latestEtag },
      {
        onSuccess: (data: AccessList) => {
          setLatestEtag(data.etag);
        },
        onError: (error) => {
          checkForEtagVersionError(error);
        },
      },
    );
  };

  const handleDelete = (): void => {
    deleteAccessList(latestEtag, {
      onSuccess: () => {
        toast.success(t('resourceadm.listadmin_delete_list_success', { listname: listName }));
        navigate(backUrl);
      },
      onError: (error) => {
        checkForEtagVersionError(error);
        closeModal();
      },
    });
  };

  const closeModal = (): void => {
    deleteWarningModalRef.current?.close();
  };

  const handleBackClick = (event: React.MouseEvent<HTMLAnchorElement>): void => {
    event.preventDefault();
    navigate(backUrl);
  };

  return (
    <div className={classes.accessListDetailWrapper}>
      <StudioDialog ref={deleteWarningModalRef} onClose={closeModal}>
        <ResourceAdmDialogContent
          heading={t('resourceadm.listadmin_delete_list_header')}
          footer={
            <>
              <StudioButton color='danger' onClick={() => handleDelete()}>
                {t('resourceadm.listadmin_delete_list')}
              </StudioButton>
              <StudioButton variant='tertiary' onClick={closeModal}>
                {t('general.cancel')}
              </StudioButton>
            </>
          }
        >
          {t('resourceadm.listadmin_delete_list_description')}
        </ResourceAdmDialogContent>
      </StudioDialog>
      <div>
        <StudioLink href={backUrl} onClick={handleBackClick}>
          {t('general.back')}
        </StudioLink>
      </div>
      <StudioHeading level={1} data-size='lg'>
        {t('resourceadm.listadmin_list_detail_header')}
      </StudioHeading>
      <StudioTextfield
        label={t('resourceadm.listadmin_list_id')}
        description={t('resourceadm.listadmin_list_id_description')}
        readOnly
        value={list.identifier}
      />
      <StudioTextfield
        label={t('resourceadm.listadmin_list_name')}
        description={t('resourceadm.listadmin_list_name_description')}
        value={listName}
        onChange={(event) => setListName(event.target.value)}
        onBlur={(event) => handleSave({ ...list, name: event.target.value })}
      />
      <StudioTextfield
        label={t('resourceadm.listadmin_list_description')}
        description={t('resourceadm.listadmin_list_description_description')}
        value={listDescription}
        onChange={(event) => setListDescription(event.target.value)}
        onBlur={(event) => handleSave({ ...list, description: event.target.value })}
      />
      <AccessListMembers
        org={org}
        env={env}
        list={list}
        latestEtag={latestEtag}
        setLatestEtag={setLatestEtag}
      />
      <div>
        <StudioButton
          variant='tertiary'
          color='danger'
          icon={<TrashIcon className={classes.deleteIcon} />}
          iconPlacement='right'
          onClick={() => deleteWarningModalRef.current?.showModal()}
          disabled={isDeletingAccessList}
          data-size='md'
        >
          {t('resourceadm.listadmin_delete_list')}
        </StudioButton>
      </div>
    </div>
  );
};
