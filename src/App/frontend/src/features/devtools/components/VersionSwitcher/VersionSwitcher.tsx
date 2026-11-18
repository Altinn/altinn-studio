import React, { useId, useState } from 'react';

import { Button, Input } from '@app/form-component';
import { Fieldset, ValidationMessage } from '@digdir/designsystemet-react';

import {
  frontendVersionsUrl,
  getFrontendVersionFromUrl,
  getUrlWithFrontendVersion,
  isValidFrontendVersion,
} from 'src/features/devtools/components/VersionSwitcher/versionSwitcherUtils';
import { isDev } from 'src/utils/isDev';

const description = 'Siden lastes på nytt med versjonen i adressen. Virker bare i utviklings- og testmiljø.';
const versionsLinkText = 'Se tilgjengelige versjoner (åpnes i ny fane)';

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
  const [version, setVersion] = useState(() => getFrontendVersionFromUrl(window.location.href));
  const [error, setError] = useState<string | undefined>(undefined);
  const errorId = useId();

  function switchVersion() {
    const trimmed = version.trim();
    if (!isValidFrontendVersion(trimmed)) {
      setError('Skriv et versjonsnummer, for eksempel 9.0.0-preview.12');
      return;
    }
    window.location.assign(getUrlWithFrontendVersion(window.location.href, trimmed));
  }

  return (
    <Fieldset style={{ width: 250 }}>
      <Fieldset.Legend>Frontend versjon</Fieldset.Legend>
      <Fieldset.Description>{description}</Fieldset.Description>
      <Input
        aria-label='Frontend versjon'
        size='sm'
        value={version}
        placeholder='9.0.0-preview.12'
        error={error}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => {
          setVersion(e.target.value);
          setError(undefined);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            switchVersion();
          }
        }}
      />
      {error && (
        <ValidationMessage
          id={errorId}
          data-size='sm'
        >
          {error}
        </ValidationMessage>
      )}
      <a
        href={frontendVersionsUrl}
        target='_blank'
        rel='noopener noreferrer'
      >
        {versionsLinkText}
      </a>
      <Button
        size='sm'
        onClick={switchVersion}
      >
        Bytt versjon
      </Button>
    </Fieldset>
  );
}
