import { useState } from 'react';

import { Button, Spinner } from '@app/form-component';
import comboboxClasses from '@app/form-component/styles/combobox.module.css';
import { EXPERIMENTAL_Suggestion as Suggestion, Fieldset } from '@digdir/designsystemet-react';

import { useAppFrontendVersionsQuery } from 'src/core/queries/appFrontendVersions';
import {
  getFrontendVersionFromUrl,
  getUrlWithFrontendVersion,
} from 'src/features/devtools/components/VersionSwitcher/versionSwitcherUtils';
import { isDev } from 'src/utils/isDev';
import { optionFilter } from 'src/utils/options';

const description = 'Siden lastes på nytt med versjonen i adressen. Virker bare i utviklings- og testmiljø.';
const loadingText = 'Henter versjonene som er publisert';
const errorText = 'Kunne ikke hente versjonene som er publisert.';
const emptyText = 'Ingen versjoner funnet';
const ownVersionLabel = 'Versjonen som følger med appen';

/** Stands for the app's own frontend in the list. No published version can start with "-". */
const ownVersionValue = '-';

/**
 * Hidden in production, where the backend ignores the parameter. isDev() knows localtest, TT02 and Studio by their
 * hostnames; in the other test environments (AT, YT) the field is hidden, but the parameter in the address still works.
 */
export function VersionSwitcher() {
  if (!isDev()) {
    return null;
  }
  return <VersionSwitcherField />;
}

function VersionSwitcherField() {
  const { versions, isLoading, isError } = useAppFrontendVersionsQuery();
  const [currentVersion] = useState(() => getFrontendVersionFromUrl(window.location.href));
  const [selectedVersion, setSelectedVersion] = useState(currentVersion);
  const selectedLabel = selectedVersion || ownVersionLabel;

  function switchVersion() {
    window.location.assign(getUrlWithFrontendVersion(window.location.href, selectedVersion));
  }

  return (
    <Fieldset style={{ width: 250 }}>
      <Fieldset.Legend>Frontend versjon</Fieldset.Legend>
      <Fieldset.Description>{description}</Fieldset.Description>
      {isLoading ? (
        <Spinner aria-label={loadingText} />
      ) : isError ? (
        <p>{errorText}</p>
      ) : (
        <>
          <Suggestion
            multiple={false}
            filter={(args) => optionFilter(args, [selectedLabel])}
            data-size='sm'
            selected={{ value: selectedVersion || ownVersionValue, label: selectedLabel }}
            className={comboboxClasses.container}
            style={{ width: '100%' }}
          >
            <Suggestion.Input aria-label='Frontend versjon' />
            <Suggestion.List>
              <Suggestion.Empty>{emptyText}</Suggestion.Empty>
              <Suggestion.Option
                value={ownVersionValue}
                label={ownVersionLabel}
                onClick={() => setSelectedVersion('')}
              >
                {ownVersionLabel}
              </Suggestion.Option>
              {versions.map((version) => (
                <Suggestion.Option
                  key={version}
                  value={version}
                  label={version}
                  onClick={() => setSelectedVersion(version)}
                >
                  {version}
                </Suggestion.Option>
              ))}
            </Suggestion.List>
          </Suggestion>
          <Button
            size='sm'
            disabled={selectedVersion === currentVersion}
            onClick={switchVersion}
          >
            Bytt versjon
          </Button>
        </>
      )}
    </Fieldset>
  );
}
