import React, { useState } from 'react';
import classes from './OrganizationAccessPage.module.css';
import { Alert, Button, Heading, Spinner, Textfield } from '@digdir/design-system-react';
import {
  useEnhetsregisterOrganizationQuery,
  useEnhetsregisterUnderOrganizationQuery,
} from 'resourceadm/hooks/queries/useEnhetsregisterOrganizationQuery';
import { useDebounce } from 'react-use';
import { BrregOrganization } from 'app-shared/types/ResourceAdm';
import { ListMembers } from './listeTestData';
import { FieldWrapper } from './FieldWrapper';

interface OrganizationAccessPageProps {
  id: number;
  env: string;
  onBack: () => void;
}

// TODO: filtrer/disable  enheter som allerede finnes
const enhetsListe = (
  enheter: BrregOrganization[],
  erUnderenhet: boolean,
  onSelectEnhet: (org) => void,
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
            size='small'
            variant='tertiary'
            onClick={() => {
              onSelectEnhet({
                orgNr: org.organisasjonsnummer,
                orgName: org.navn,
                isUnderenhet: erUnderenhet,
              });
            }}
            key={org.organisasjonsnummer}
          >
            {`${org.organisasjonsnummer} - ${org.navn}`}
          </Button>
        );
      })}
    </>
  );
};

const tabellRad = (
  orgNr: string,
  orgName: string,
  isUnderenhet: boolean,
  onRemove: (orgNr: string) => void,
): React.ReactNode => {
  return (
    <tr key={orgNr} className={classes.tabellRad}>
      <td>{orgNr}</td>
      <td>{orgName}</td>
      <td>{isUnderenhet ? 'Underenhet' : 'Enhet'}</td>
      <td>{new Date().toLocaleString()}</td>
      <td>
        <Button color='danger' onClick={() => onRemove(orgNr)} variant='secondary' size='small'>
          Fjern fra liste
        </Button>
      </td>
    </tr>
  );
};

export const OrganizationAccessPage = ({
  id,
  env,
  onBack,
}: OrganizationAccessPageProps): React.ReactNode => {
  const [searchText, setSearchText] = useState<string>('');
  const [debouncedSearchText, setDebouncedSearchText] = useState<string>('');
  useDebounce(() => setDebouncedSearchText(searchText), 500, [searchText]);

  const liste = ListMembers.find((x) => x.listId === id);
  const reg_enheter = liste ? liste.members : [];
  const [listItems, setListItems] =
    useState<{ orgNr: string; isUnderenhet: boolean; orgName: string }[]>(reg_enheter);

  const [listName, setListName] = useState<string>(liste?.name || '');

  const { data: enheterSearchData, isLoading: isLoadingEnheterSearch } =
    useEnhetsregisterOrganizationQuery(debouncedSearchText);
  const { data: underenheterSearchData, isLoading: isLoadingUnderenheterSearch } =
    useEnhetsregisterUnderOrganizationQuery(debouncedSearchText);

  return (
    <div className={classes.pageWrapper}>
      <Button size='small' variant='tertiary' onClick={() => onBack()}>
        Tilbake
      </Button>
      <FieldWrapper label='Listenavn' description='Gi listen et beskrivende navn'>
        <Textfield value={listName} onChange={(event) => setListName(event.target.value)} />
      </FieldWrapper>
      <table className={classes.tabell}>
        <thead>
          <tr>
            <th>Orgnr</th>
            <th>Navn</th>
            <th>Type</th>
            <th>Lagt til</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {listItems.length === 0 && (
            <tr>
              <td colSpan={100}>
                <Alert severity='info'>Listen inneholder ingen enheter</Alert>
              </td>
            </tr>
          )}
          {listItems.map((org) => {
            return tabellRad(org.orgNr, org.orgName, org.isUnderenhet, (orgNr: string) => {
              setListItems((old) => old.filter((x) => x.orgNr !== orgNr));
            });
          })}
          <tr>
            <td colSpan={100}>
              <div>
                <FieldWrapper
                  label='Legg til enhet'
                  description='Du kan søke etter enheter med navn eller et organisasjonsnummer'
                >
                  <Textfield
                    value={searchText}
                    placeholder='søk etter enhet'
                    onChange={(event) => {
                      setSearchText(event.target.value);
                    }}
                  />
                </FieldWrapper>

                {(isLoadingEnheterSearch || isLoadingUnderenheterSearch) && debouncedSearchText && (
                  <Spinner size='xlarge' variant='interaction' title='Laster...' />
                )}
                {debouncedSearchText.length > 0 &&
                  !isLoadingEnheterSearch &&
                  !isLoadingUnderenheterSearch && (
                    <div>
                      {enhetsListe(enheterSearchData?._embedded?.enheter || [], false, (nyOrg) => {
                        setListItems((old) => [...old, nyOrg]);
                      })}
                      {enhetsListe(
                        underenheterSearchData?._embedded?.underenheter || [],
                        true,
                        (nyOrg) => {
                          setListItems((old) => [...old, nyOrg]);
                        },
                      )}
                    </div>
                  )}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      {!!id && (
        <Button variant='secondary' color='danger'>
          Slett liste
        </Button>
      )}
    </div>
  );
};
