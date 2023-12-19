import React, { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Table,
  TableRow,
  TableCell,
  TableHeader,
  TableBody,
  Textfield,
  Modal,
  Heading,
  Link as DigdirLink,
} from '@digdir/design-system-react';
import classes from './PartyListDetail.module.css';
import { PartyList, PartyListMember } from 'app-shared/types/ResourceAdm';
import { FieldWrapper } from '../FieldWrapper/FieldWrapper';
import { useEditPartyListMutation } from 'resourceadm/hooks/mutations/useEditPartyListMutation';
import { useRemovePartyListMemberMutation } from 'resourceadm/hooks/mutations/useRemovePartyListMemberMutation';
import { useAddPartyListMemberMutation } from 'resourceadm/hooks/mutations/useAddPartyListMemberMutation';
import { createReplacePatch } from '../../utils/jsonPatchUtils/jsonPatchUtils';
import { useDeletePartyListMutation } from 'resourceadm/hooks/mutations/useDeletePartyListMutation';
import { PartyListSearch } from '../PartyListSearch/PartyListSearch';

export interface PartyListDetailProps {
  org: string;
  env: string;
  list: PartyList;
  backUrl: string;
}

export const PartyListDetail = ({
  org,
  env,
  list,
  backUrl,
}: PartyListDetailProps): React.ReactNode => {
  const { t } = useTranslation();

  const deleteWarningModalRef = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  const [listItems, setListItems] = useState<(PartyListMember & { isDeleted?: boolean })[]>(
    list.members ?? [],
  );
  const [listName, setListName] = useState<string>(list.name || '');
  const [listDescription, setListDescription] = useState<string>(list.description || '');

  const { mutate: editPartyList } = useEditPartyListMutation(org, list.identifier, env);
  const { mutate: deletePartyList } = useDeletePartyListMutation(org, list.identifier, env);
  const { mutate: removeListMember } = useRemovePartyListMemberMutation(org, list.identifier, env);
  const { mutate: addListMember } = useAddPartyListMemberMutation(org, list.identifier, env);

  // add member
  const handleAddMember = (memberToAdd: PartyListMember): void => {
    addListMember(memberToAdd.orgNr);
    setListItems((old) => [...old, memberToAdd]);
  };

  // remove member
  const handleRemoveMember = (memberIdToRemove: string): void => {
    removeListMember(memberIdToRemove);
    setListItems((old) =>
      old.map((x) => (x.orgNr === memberIdToRemove ? { ...x, isDeleted: true } : x)),
    );
  };

  // undo remove member
  const handleUndoRemoveMember = (memberIdToUndoRemove: string): void => {
    addListMember(memberIdToUndoRemove);
    setListItems((old) =>
      old.map((x) => (x.orgNr === memberIdToUndoRemove ? { ...x, isDeleted: false } : x)),
    );
  };

  // change list name, description and possibly other properties
  const handleSave = (diff: Partial<PartyList>): void => {
    editPartyList(createReplacePatch<Partial<PartyList>>(diff));
  };

  // slett, må gjøres utenfor? Evt ha en back-funksjon
  const handleDelete = (): void => {
    deletePartyList(undefined, {
      onSuccess: () => navigate(backUrl),
      onError: (_error: any) => {
        // TODO
      },
    });
  };

  const closeModal = (): void => {
    deleteWarningModalRef.current?.close();
  };

  return (
    <div className={classes.partyListDetailWrapper}>
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
      <FieldWrapper
        label={t('resourceadm.listadmin_list_organizations')}
        description={t('resourceadm.listadmin_list_organizations_description')}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell>{t('resourceadm.listadmin_orgnr')}</TableCell>
              <TableCell>{t('resourceadm.listadmin_navn')}</TableCell>
              <TableCell>{t('resourceadm.listadmin_type')}</TableCell>
              <TableCell />
            </TableRow>
          </TableHeader>
          <TableBody>
            {listItems.length === 0 && (
              <tr>
                <td colSpan={100}>
                  <Alert severity='info'>{t('resourceadm.listadmin_empty_list')}</Alert>
                </td>
              </tr>
            )}
            {listItems.map((item) => {
              return (
                <TableRow key={item.orgNr} className={item.isDeleted ? classes.memberDeleted : ''}>
                  <TableCell>{item.orgNr}</TableCell>
                  <TableCell>{item.orgName || t('resourceadm.listadmin_empty_name')}</TableCell>
                  <TableCell>
                    {item.isUnderenhet
                      ? t('resourceadm.listadmin_underenhet')
                      : t('resourceadm.listadmin_enhet')}
                  </TableCell>
                  <TableCell>
                    <Button
                      color={item.isDeleted ? 'second' : 'danger'}
                      onClick={() =>
                        item.isDeleted
                          ? handleUndoRemoveMember(item.orgNr)
                          : handleRemoveMember(item.orgNr)
                      }
                      variant='secondary'
                      size='small'
                    >
                      {item.isDeleted
                        ? t('resourceadm.listadmin_undo_remove_from_list')
                        : t('resourceadm.listadmin_remove_from_list')}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow>
              <TableCell colSpan={100}>
                <PartyListSearch existingMembers={listItems} handleAddMember={handleAddMember} />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </FieldWrapper>
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
