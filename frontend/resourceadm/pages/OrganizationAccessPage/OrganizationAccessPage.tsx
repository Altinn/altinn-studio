import React, { useState } from 'react';
import classes from './OrganizationAccessPage.module.css';
import { Alert, Button, Heading, Spinner, Textfield } from '@digdir/design-system-react';
import {
  useEnhetsregisterOrganizationQuery,
  useEnhetsregisterUnderOrganizationQuery,
} from 'resourceadm/hooks/queries/useEnhetsregisterOrganizationQuery';
import { useDebounce } from 'react-use';
import { BrregOrganization } from 'app-shared/types/ResourceAdm';
import {
  useEnhetsregisterEnhetOrgnrQuery,
  useEnhetsregisterUnderenhetOrgnrQuery,
} from 'resourceadm/hooks/queries/useEnhetsregisterOrgnrQuery';

const TEST_DATA = ['991825827', '997532422', '891611862', '111611111'];

interface OrganizationAccessPageProps {}

// TODO: filtrer/disable  enheter som allerede finnes
const enhetsListe = (enheter: BrregOrganization[], erUnderenhet: boolean): React.ReactNode => {
  if (enheter.length === 0) {
    return <div>{erUnderenhet ? 'Fant ingen underenheter' : 'Fant ingen enheter'}</div>;
  }
  return (
    <>
      <option disabled={true}>{erUnderenhet ? 'Underenheter' : 'Enheter'}</option>
      {enheter.map((org) => {
        return (
          <option key={org.organisasjonsnummer} value={org.organisasjonsnummer}>
            {org.navn}
          </option>
        );
      })}
    </>
  );
};

const tabellRad = (enhet: BrregOrganization, typeString: string): React.ReactNode => {
  return (
    <tr key={enhet.organisasjonsnummer} className={classes.tabellRad}>
      <td>{enhet.organisasjonsnummer}</td>
      <td>{enhet.navn}</td>
      <td>{typeString}</td>
      <td>{new Date().toLocaleString()}</td>
      <td>
        <Button
          color='danger'
          onClick={() => {
            /** */
          }}
          variant='secondary'
          size='small'
        >
          Fjern tilgang
        </Button>
      </td>
    </tr>
  );
};

export const OrganizationAccessPage = ({}: OrganizationAccessPageProps): React.ReactNode => {
  const [searchText, setSearchText] = useState<string>('');
  const [debouncedSearchText, setDebouncedSearchText] = useState<string>('');
  useDebounce(() => setDebouncedSearchText(searchText), 500, [searchText]);

  const reg_enheter = TEST_DATA;

  const { data: enheterData } = useEnhetsregisterEnhetOrgnrQuery(reg_enheter);
  const { data: underenheterData } = useEnhetsregisterUnderenhetOrgnrQuery(reg_enheter);

  const { data: enheterSearchData, isLoading: isLoadingEnheterSearch } =
    useEnhetsregisterOrganizationQuery(debouncedSearchText);
  const { data: underenheterSearchData, isLoading: isLoadingUnderenheterSearch } =
    useEnhetsregisterUnderOrganizationQuery(debouncedSearchText);

  return (
    <div className={classes.pageWrapper}>
      <Heading level={1} size='large' spacing>
        Organisasjonstilganger
      </Heading>
      <Alert severity='info'>Følgende enheter har tilgang til ressursen</Alert>
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
          {TEST_DATA.map((orgnr) => {
            const enhet = (enheterData?._embedded.enheter || []).find(
              (x) => x.organisasjonsnummer === orgnr,
            );
            const erUnderenhet = (underenheterData?._embedded.underenheter || []).find(
              (x) => x.organisasjonsnummer === orgnr,
            );
            if (enhet) {
              return tabellRad(enhet, 'Enhet');
            } else if (erUnderenhet) {
              return tabellRad(erUnderenhet, 'Underenhet');
            }
            return tabellRad({ organisasjonsnummer: orgnr, navn: '<navn ikke funnet>' }, '');
          })}
          <tr>
            <td colSpan={100}>
              <div>
                <label>Legg til tilgang for enheter og underenheter:</label>
                <Textfield
                  list='orgsearch'
                  value={searchText}
                  placeholder='søk etter enhet'
                  onChange={(event) => {
                    setSearchText(event.target.value);
                  }}
                />
                {(isLoadingEnheterSearch || isLoadingUnderenheterSearch) && (
                  <Spinner size='xlarge' variant='interaction' title='Laster..' />
                )}
                {debouncedSearchText.length > 0 &&
                  !isLoadingEnheterSearch &&
                  !isLoadingUnderenheterSearch && (
                    <datalist id='orgsearch'>
                      {enhetsListe(enheterSearchData?._embedded?.enheter || [], false)}
                      {enhetsListe(underenheterSearchData?._embedded?.underenheter || [], true)}
                    </datalist>
                  )}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
