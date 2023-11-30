import React, { useState } from 'react';
import classes from './OrganizationAccessPage.module.css';
import {
  Alert,
  Button,
  Heading,
  Spinner,
  Table,
  TableRow,
  TableCell,
  TableHeader,
  TableBody,
  Textfield,
} from '@digdir/design-system-react';
import {
  useEnhetsregisterOrganizationQuery,
  useEnhetsregisterUnderOrganizationQuery,
} from 'resourceadm/hooks/queries/useEnhetsregisterOrganizationQuery';
import { useDebounce } from 'react-use';
import {
  BrregOrganization,
  ResourceRightsRegistryList,
  ResourceRightsRegistryListMember,
  ResourceRightsRegistryListWithMembers,
} from 'app-shared/types/ResourceAdm';
import { FieldWrapper } from './FieldWrapper';

interface OrganizationAccessPageProps {
  list: ResourceRightsRegistryListWithMembers;
  onDeleted: () => void;
}

// TODO: filtrer/disable enheter som allerede finnes
const enhetsListe = (
  enheter: BrregOrganization[],
  erUnderenhet: boolean,
  onSelectEnhet: (org: ResourceRightsRegistryListMember) => void,
): React.ReactNode => {
  if (enheter.length === 0) {
    return <div>{erUnderenhet ? 'Fant ingen underenheter' : 'Fant ingen enheter'}</div>;
  }
  return (
    <>
      <Heading level={2} size='medium'>
        {erUnderenhet ? 'Underenheter' : 'Enheter'}
      </Heading>
      {enheter.map((org) => {
        return (
          <Button
            key={org.organisasjonsnummer}
            size='small'
            variant='tertiary'
            onClick={() => {
              onSelectEnhet({
                orgNr: org.organisasjonsnummer,
                orgName: org.navn,
                isUnderenhet: erUnderenhet,
              });
            }}
          >
            {`${org.organisasjonsnummer} - ${org.navn}`}
          </Button>
        );
      })}
    </>
  );
};

export const OrganizationAccessPage = ({
  list,
  onDeleted,
}: OrganizationAccessPageProps): React.ReactNode => {
  const [searchText, setSearchText] = useState<string>('');
  const [debouncedSearchText, setDebouncedSearchText] = useState<string>('');
  useDebounce(() => setDebouncedSearchText(searchText), 500, [searchText]);

  const reg_enheter = list ? list.members : [];
  const [listItems, setListItems] =
    useState<(ResourceRightsRegistryListMember & { isDeleted?: boolean })[]>(reg_enheter);

  const [listName, setListName] = useState<string>(list?.title || '');

  const { data: enheterSearchData, isLoading: isLoadingEnheterSearch } =
    useEnhetsregisterOrganizationQuery(debouncedSearchText);
  const { data: underenheterSearchData, isLoading: isLoadingUnderenheterSearch } =
    useEnhetsregisterUnderOrganizationQuery(debouncedSearchText);

  // add member
  const handleAddMember = (memberToAdd: ResourceRightsRegistryListMember): void => {
    console.log('ADD member', memberToAdd);
    setListItems((old) => [...old, memberToAdd]);
  };

  // remove member
  const handleRemoveMember = (memberIdToRemove: string): void => {
    console.log('DELETE member', memberIdToRemove);
    setListItems((old) =>
      old.map((x) => (x.orgNr === memberIdToRemove ? { ...x, isDeleted: true } : x)),
    );
  };

  // undo remove member
  const handleUndoRemoveMember = (memberIdToUndoRemove: string): void => {
    console.log('ADD member', memberIdToUndoRemove);
    setListItems((old) =>
      old.map((x) => (x.orgNr === memberIdToUndoRemove ? { ...x, isDeleted: false } : x)),
    );
  };

  // change list name, and possibly other properties
  const handleSave = (diff: Partial<ResourceRightsRegistryList>): void => {
    console.log('SAVE', { ...list, ...diff });
  };

  // slett, må gjøres utenfor? Evt ha en back-funksjon
  const handleDelete = (): void => {
    console.log('DELETE', list.id);
    onDeleted();
  };

  return (
    <div className={classes.pageWrapper}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <FieldWrapper label='Listenavn' description='Gi listen et beskrivende navn'>
          <Textfield
            value={listName}
            onChange={(event) => setListName(event.target.value)}
            onBlur={(event) => handleSave({ title: event.target.value })}
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
              {listItems.map((org) => {
                return (
                  <TableRow
                    key={org.orgNr}
                    style={{ backgroundColor: org.isDeleted ? '#ccc' : undefined }}
                  >
                    <TableCell>{org.orgNr}</TableCell>
                    <TableCell>{org.orgName}</TableCell>
                    <TableCell>{org.isUnderenhet ? 'Underenhet' : 'Enhet'}</TableCell>
                    <TableCell>
                      <Button
                        color={org.isDeleted ? 'second' : 'danger'}
                        onClick={() =>
                          org.isDeleted
                            ? handleUndoRemoveMember(org.orgNr)
                            : handleRemoveMember(org.orgNr)
                        }
                        variant='secondary'
                        size='small'
                      >
                        {org.isDeleted ? 'Angre fjern' : 'Fjern fra liste'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell colSpan={100}>
                  <div>
                    <Textfield
                      value={searchText}
                      placeholder='søk etter enhet'
                      onChange={(event) => {
                        setSearchText(event.target.value);
                      }}
                    />
                    {(isLoadingEnheterSearch || isLoadingUnderenheterSearch) &&
                      debouncedSearchText && (
                        <Spinner size='xlarge' variant='interaction' title='Laster...' />
                      )}
                    {debouncedSearchText.length > 0 &&
                      !isLoadingEnheterSearch &&
                      !isLoadingUnderenheterSearch && (
                        <div>
                          {enhetsListe(
                            enheterSearchData?._embedded?.enheter || [],
                            false,
                            handleAddMember,
                          )}
                          {enhetsListe(
                            underenheterSearchData?._embedded?.underenheter || [],
                            true,
                            handleAddMember,
                          )}
                        </div>
                      )}
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </FieldWrapper>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <Button variant='secondary' color='danger' onClick={handleDelete}>
          Slett liste
        </Button>
      </div>
    </div>
  );
};
