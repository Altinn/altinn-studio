import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
} from '@digdir/design-system-react';
import { PartyList, PartyListMember } from 'app-shared/types/ResourceAdm';
import { FieldWrapper } from '../FieldWrapper/FieldWrapper';
import { useEditPartyListMutation } from 'resourceadm/hooks/mutations/useEditPartyListMutation';
import { useRemovePartyListMemberMutation } from 'resourceadm/hooks/mutations/useRemovePartyListMemberMutation';
import { useAddPartyListMemberMutation } from 'resourceadm/hooks/mutations/useAddPartyListMemberMutation';
import { createReplacePatch } from '../../utils/jsonPatchUtils/jsonPatchUtils';
import { useDeletePartyListMutation } from 'resourceadm/hooks/mutations/useDeletePartyListMutation';
import { PartyListSearch } from './PartyListSearch';

interface PartyListDetailProps {
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
  const deleteWarningModalRef = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  const [listItems, setListItems] = useState<(PartyListMember & { isDeleted?: boolean })[]>(
    list.members,
  );
  const [listName, setListName] = useState<string>(list.name || '');
  const [listDescription, setListDescription] = useState<string>(list.description || '');

  const { mutate: editPartyList } = useEditPartyListMutation(org, list.identifier, env);
  const { mutate: deletePartyList } = useDeletePartyListMutation(org, list.identifier, env);
  const { mutate: removeListMember } = useRemovePartyListMemberMutation(org, list.identifier, env);
  const { mutate: addListMember } = useAddPartyListMemberMutation(org, list.identifier, env);

  // add member
  const handleAddMember = (memberToAdd: PartyListMember): void => {
    console.log('ADD member', memberToAdd);
    addListMember(memberToAdd.orgNr);
    setListItems((old) => [...old, memberToAdd]);
  };

  // remove member
  const handleRemoveMember = (memberIdToRemove: string): void => {
    console.log('DELETE member', memberIdToRemove);
    removeListMember(memberIdToRemove);
    setListItems((old) =>
      old.map((x) => (x.orgNr === memberIdToRemove ? { ...x, isDeleted: true } : x)),
    );
  };

  // undo remove member
  const handleUndoRemoveMember = (memberIdToUndoRemove: string): void => {
    console.log('ADD member', memberIdToUndoRemove);
    addListMember(memberIdToUndoRemove);
    setListItems((old) =>
      old.map((x) => (x.orgNr === memberIdToUndoRemove ? { ...x, isDeleted: false } : x)),
    );
  };

  // change list name, description and possibly other properties
  const handleSave = (diff: Partial<PartyList>): void => {
    console.log('SAVE', { ...list, ...diff });
    editPartyList(createReplacePatch<Partial<PartyList>>(diff));
  };

  // slett, må gjøres utenfor? Evt ha en back-funksjon
  const handleDelete = (): void => {
    console.log('DELETE', list.identifier);
    deletePartyList(undefined, {
      onSuccess: () => navigate(backUrl),
      onError: (error: any) => {
        // TODO
      },
    });
  };

  return (
    <div style={{ margin: '1rem' }}>
      <Modal ref={deleteWarningModalRef} onClose={() => deleteWarningModalRef.current?.close()}>
        <Modal.Header>Bekreft sletting av liste</Modal.Header>
        <Modal.Content>Vil du slette denne listen?</Modal.Content>
        <Modal.Footer>
          <Button color='danger' onClick={() => handleDelete()}>
            Slett liste
          </Button>
          <Button variant='tertiary' onClick={() => deleteWarningModalRef.current?.close()}>
            Avbryt
          </Button>
        </Modal.Footer>
      </Modal>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
          maxWidth: '50rem',
          margin: '2rem 0',
        }}
      >
        <Link to={backUrl}>Tilbake</Link>
        <FieldWrapper
          label='Listenavn'
          description='Gi listen et beskrivende navn, f.eks "Godkjente banker"'
        >
          <Textfield
            value={listName}
            onChange={(event) => setListName(event.target.value)}
            onBlur={(event) => handleSave({ name: event.target.value })}
          />
        </FieldWrapper>
        <FieldWrapper label='Beskrivelse' description='Her kan du beskrive listen'>
          <Textfield
            value={listDescription}
            onChange={(event) => setListDescription(event.target.value)}
            onBlur={(event) => handleSave({ description: event.target.value })}
          />
        </FieldWrapper>
        <FieldWrapper
          label='Enheter i listen'
          description='Enheter i denne listen vil ha tilgang til ressursen'
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Orgnr</TableCell>
                <TableCell>Navn</TableCell>
                <TableCell>Type</TableCell>
                <TableCell />
              </TableRow>
            </TableHeader>
            <TableBody>
              {listItems.length === 0 && (
                <tr>
                  <td colSpan={100}>
                    <Alert severity='info'>Listen inneholder ingen enheter</Alert>
                  </td>
                </tr>
              )}
              {listItems.map((item) => {
                return (
                  <TableRow
                    key={item.orgNr}
                    style={{ backgroundColor: item.isDeleted ? '#ccc' : undefined }}
                  >
                    <TableCell>{item.orgNr}</TableCell>
                    <TableCell>{item.orgName || '<navn ikke funnet>'}</TableCell>
                    <TableCell>{item.isUnderenhet ? 'Underenhet' : 'Enhet'}</TableCell>
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
                        {item.isDeleted ? 'Angre fjern' : 'Fjern fra liste'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell colSpan={100}>
                  <PartyListSearch handleAddMember={handleAddMember} />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </FieldWrapper>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <Button
          variant='secondary'
          color='danger'
          onClick={() => deleteWarningModalRef.current?.showModal()}
        >
          Slett liste
        </Button>
      </div>
    </div>
  );
};
