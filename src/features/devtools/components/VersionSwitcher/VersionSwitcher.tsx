import React from 'react';

import { Combobox, Fieldset, Spinner } from '@digdir/designsystemet-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { Button } from 'src/app-components/Button/Button';
import comboboxClasses from 'src/styles/combobox.module.css';
import { appFrontendCDNPath, appPath, frontendVersionsCDN } from 'src/utils/urls/appUrlHelper';

export const VersionSwitcher = () => {
  const [selectedVersion, setSelectedVersion] = React.useState<string | undefined>(undefined);
  const {
    data: versions,
    isLoading: isVersionsLoading,
    isError: isVersionsError,
  } = useQuery({
    queryKey: ['frontendVersions'],
    queryFn: () => axios.get(frontendVersionsCDN).then((res) => res.data),
    select: (data: string[]) => [
      { label: 'localhost:8080', value: 'http://localhost:8080' },
      ...data
        .slice()
        .reverse()
        .map((v) => ({ label: v, value: `${appFrontendCDNPath}/${v}` })),
    ],
  });

  const {
    data: html,
    isLoading: isHtmlLoading,
    isError: isHtmlError,
  } = useQuery({
    queryKey: ['indexHtml'],
    queryFn: () => axios.get(appPath).then((res) => res.data),
  });

  const onClick = () => {
    if (selectedVersion) {
      const newDoc = html
        .replace(/src=".*\/altinn-app-frontend.js"/, `src="${selectedVersion}/altinn-app-frontend.js"`)
        .replace(/href=".*\/altinn-app-frontend.css"/, `href="${selectedVersion}/altinn-app-frontend.css"`);
      document.open();
      document.write(newDoc);
      document.close();
    }
  };

  if (isVersionsLoading || isHtmlLoading || !versions) {
    return <Spinner aria-label='Laster...' />;
  }

  if (isVersionsError || isHtmlError) {
    return <p>Det skjedde en feil ved henting av versjoner</p>;
  }

  return (
    <Fieldset style={{ width: 250 }}>
      <Fieldset.Legend>Frontend versjon</Fieldset.Legend>
      <Combobox
        size='sm'
        value={selectedVersion ? [selectedVersion] : []}
        onValueChange={(values) => setSelectedVersion(values.at(0))}
        className={comboboxClasses.container}
      >
        {versions.map((version) => (
          <Combobox.Option
            key={version.value}
            value={version.value}
            displayValue={version.label}
          >
            {version.label}
          </Combobox.Option>
        ))}
      </Combobox>
      {selectedVersion && <span>Last inn siden på nytt for å gå tilbake til opprinnelig versjon.</span>}
      <Button
        id='version-switcher-button'
        style={{ width: '100%' }}
        disabled={!selectedVersion}
        onClick={onClick}
      >
        Bytt versjon
      </Button>
    </Fieldset>
  );
};
