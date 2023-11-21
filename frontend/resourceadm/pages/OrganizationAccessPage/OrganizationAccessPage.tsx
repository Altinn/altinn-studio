import React, { useState } from 'react';
import { Heading, Spinner, Textfield } from '@digdir/design-system-react';
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

interface OrganizationAccessPageProps {}

const enhetsListe = (enheter: BrregOrganization[], erUnderenhet: boolean): React.ReactNode => {
  if (enheter.length === 0) {
    return <div>{erUnderenhet ? 'Fant ingen underenheter' : 'Fant ingen enheter'}</div>;
  }
  return (
    <>
      <h3>{erUnderenhet ? 'Underenheter' : 'Enheter'}</h3>
      {enheter.map((org) => {
        return (
          <div key={org.organisasjonsnummer}>
            {org.organisasjonsnummer} - {org.navn}
          </div>
        );
      })}
    </>
  );
};

const tabellRad = (enhet: BrregOrganization, typeString: string): React.ReactNode => {
  return (
    <tr key={enhet.organisasjonsnummer}>
      <td>{enhet.organisasjonsnummer}</td>
      <td>{enhet.navn}</td>
      <td>{typeString}</td>
      <td>{new Date().toLocaleString()}</td>
      <td>
        <button>Fjern tilgang</button>
      </td>
    </tr>
  );
};

export const OrganizationAccessPage = ({}: OrganizationAccessPageProps): React.ReactNode => {
  const [searchText, setSearchText] = useState<string>('');
  const [debouncedSearchText, setDebouncedSearchText] = useState<string>('');
  useDebounce(() => setDebouncedSearchText(searchText), 500, [searchText]);

  const TEST_DATA = ['991825827', '997532422', '891611862', '111611111'];

  const { data: enheterData } = useEnhetsregisterEnhetOrgnrQuery(TEST_DATA);
  const { data: underenheterData } = useEnhetsregisterUnderenhetOrgnrQuery(TEST_DATA);

  const { data: enheterSearchData, isLoading: isLoadingEnheterSearch } =
    useEnhetsregisterOrganizationQuery(debouncedSearchText);
  const { data: underenheterSearchData, isLoading: isLoadingUnderenheterSearch } =
    useEnhetsregisterUnderOrganizationQuery(debouncedSearchText);
  return (
    <div style={{ margin: '1rem' }}>
      <Heading level={1} size='large' spacing>
        Organisasjonstilganger
      </Heading>
      <div>Følgende enheter har tilgang til ressursen:</div>
      <table style={{ margin: '2rem 0', borderSpacing: '16px 4px' }}>
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
        </tbody>
      </table>
      <div>
        <label>Legg til tilgang for enheter og underenheter:</label>
        <Textfield
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
            <>
              {enhetsListe(enheterSearchData?._embedded?.enheter || [], false)}
              {enhetsListe(underenheterSearchData?._embedded?.underenheter || [], true)}
            </>
          )}
      </div>
    </div>
  );
};
