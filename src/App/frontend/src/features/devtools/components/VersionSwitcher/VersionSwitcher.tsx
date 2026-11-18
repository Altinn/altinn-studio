import React, { useState } from 'react';

import { Button, Input } from '@app/form-component';
import { Fieldset, ValidationMessage } from '@digdir/designsystemet-react';

import {
  frontendVersionsUrl,
  getFrontendVersionFromUrl,
  getUrlWithFrontendVersion,
  isValidFrontendVersion,
} from 'src/features/devtools/components/VersionSwitcher/versionSwitcherUtils';

const description = 'Siden lastes på nytt med versjonen i adressen.';
const versionsLinkText = 'Se tilgjengelige versjoner (åpnes i ny fane)';

export function VersionSwitcher() {
  const [version, setVersion] = useState(() => getFrontendVersionFromUrl(window.location.href));
  const [error, setError] = useState<string | undefined>(undefined);

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
      {error && <ValidationMessage data-size='sm'>{error}</ValidationMessage>}
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
