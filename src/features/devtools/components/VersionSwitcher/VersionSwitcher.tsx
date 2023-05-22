import React from 'react';

import { Button, FieldSet, Select, Spinner } from '@digdir/design-system-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { appFrontendCDNPath, appPath, frontendVersionsCDN } from 'src/utils/urls/appUrlHelper';

export const VersionSwitcher = () => {
  const [selectedVersion, setSelectedVersion] = React.useState<string>('');
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
    const newDoc = html
      .replace(/src=".*\/altinn-app-frontend.js"/, `src="${selectedVersion}/altinn-app-frontend.js"`)
      .replace(/href=".*\/altinn-app-frontend.css"/, `href="${selectedVersion}/altinn-app-frontend.css"`);
    document.open();
    document.write(newDoc);
    document.close();
  };

  if (isVersionsLoading || isHtmlLoading) {
    return <Spinner title={'Laster...'} />;
  }

  if (isVersionsError || isHtmlError) {
    return <p>Det skjedde en feil ved henting av versjoner</p>;
  }

  return (
    <FieldSet
      legend='Frontend versjon'
      style={{ width: 250 }}
    >
      <Select
        value={selectedVersion}
        options={versions}
        onChange={(value) => setSelectedVersion(value)}
      />
      {selectedVersion && <span>Last inn siden på nytt for å gå tilbake til opprinnelig versjon.</span>}
      <Button
        id='version-switcher-button'
        style={{ width: '100%' }}
        disabled={!selectedVersion}
        onClick={onClick}
      >
        Bytt versjon
      </Button>
    </FieldSet>
  );
};
