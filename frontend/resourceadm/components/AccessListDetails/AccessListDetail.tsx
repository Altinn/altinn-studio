import React, { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Textfield, Modal, Heading, Link as DigdirLink } from '@digdir/design-system-react';
import classes from './AccessListDetail.module.css';
import { AccessList } from 'app-shared/types/ResourceAdm';
import { FieldWrapper } from '../FieldWrapper';
import { useEditAccessListMutation } from 'resourceadm/hooks/mutations/useEditAccessListMutation';
import { createReplacePatch } from '../../utils/jsonPatchUtils/jsonPatchUtils';
import { useDeleteAccessListMutation } from 'resourceadm/hooks/mutations/useDeleteAccessListMutation';
import { AccessListMembers } from '../AccessListMembers';

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
}: AccessListDetailProps): React.ReactNode => {
  const { t } = useTranslation();

  const deleteWarningModalRef = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();

  const [listName, setListName] = useState<string>(list.name || '');
  const [listDescription, setListDescription] = useState<string>(list.description || '');

  const { mutate: editAccessList } = useEditAccessListMutation(org, list.identifier, env);
  const { mutate: deleteAccessList } = useDeleteAccessListMutation(org, list.identifier, env);

  // change list name, description and possibly other properties
  const handleSave = (diff: Partial<AccessList>): void => {
    editAccessList(createReplacePatch<Partial<AccessList>>(diff));
  };

  const handleDelete = (): void => {
    deleteAccessList(undefined, {
      onSuccess: () => navigate(backUrl),
    });
  };

  const closeModal = (): void => {
    deleteWarningModalRef.current?.close();
  };

  return (
    <div className={classes.accessListDetailWrapper}>
      <Modal ref={deleteWarningModalRef} onClose={closeModal}>
        <Modal.Header>{t('resourceadm.listadmin_delete_list_header')}</Modal.Header>
        <Modal.Content>{t('resourceadm.listadmin_delete_list_description')}</Modal.Content>
        <Modal.Footer>
          <Button color='danger' onClick={() => handleDelete()}>
            {t('resourceadm.listadmin_delete_list')}
          </Button>
          <Button variant='tertiary' onClick={closeModal}>
            {t('general.cancel')}
          </Button>
        </Modal.Footer>
      </Modal>
      <div>
        <DigdirLink to={backUrl} as={Link}>
          {t('general.back')}
        </DigdirLink>
      </div>
      <Heading level={1} size='large'>
        {t('resourceadm.listadmin_list_detail_header')}
      </Heading>
      <FieldWrapper
        label={t('resourceadm.listadmin_list_id')}
        description={t('resourceadm.listadmin_list_id_description')}
      >
        <Textfield value={list.identifier} disabled />
      </FieldWrapper>
      <FieldWrapper
        fieldId='listname'
        label={t('resourceadm.listadmin_list_name')}
        description={t('resourceadm.listadmin_list_id_description')}
        ariaDescriptionId='listname-description'
      >
        <Textfield
          id='listname'
          aria-describedby='listname-description'
          value={listName}
          onChange={(event) => setListName(event.target.value)}
          onBlur={(event) => handleSave({ name: event.target.value })}
        />
      </FieldWrapper>
      <FieldWrapper
        fieldId='listdescription'
        label={t('resourceadm.listadmin_list_description')}
        description={t('resourceadm.listadmin_list_description_description')}
        ariaDescriptionId='listdescription-description'
      >
        <Textfield
          id='listdescription'
          aria-describedby='listdescription-description'
          value={listDescription}
          onChange={(event) => setListDescription(event.target.value)}
          onBlur={(event) => handleSave({ description: event.target.value })}
        />
      </FieldWrapper>
      <AccessListMembers org={org} env={env} list={list} />
      <div>
        <Button
          variant='secondary'
          color='danger'
          onClick={() => deleteWarningModalRef.current?.showModal()}
        >
          {t('resourceadm.listadmin_delete_list')}
        </Button>
      </div>
    </div>
  );
};
