import React from 'react';

import { initialStateStore } from 'nextsrc/nextpoc/stores/settingsStore';
import { useStore } from 'zustand';

import { InnerHeader } from 'src/components/presentation/Header';

export const Header: React.FunctionComponent = () => {
  const applicationMetadata = useStore(initialStateStore, (state) => state.applicationMetadata);

  const appName = applicationMetadata.title['nb'];

  return (
    <InnerHeader
      header={appName}
      aboveHeader={applicationMetadata.org}
    />
  );
};
