import React from 'react';
import { useLoaderData } from 'react-router-dom';

import { GlobalData } from 'nextsrc/core/globalData';
import { InstanceList, useActiveInstances } from 'nextsrc/features/Instantiation';
import type { instanceSelectionLoader } from 'nextsrc/routes/instance-selection/instance-selection.loader';

// TODO: Replace with i18n system when language support is added to nextsrc
const texts = {
  header: 'Du har allerede startet å fylle ut dette skjemaet.',
  description:
    'Du har allerede startet å fylle ut dette skjemaet. Velg under om du vil fortsette der du slapp, eller om du vil starte på nytt.',
  leftOf: 'Fortsett der du slapp',
  lastChanged: 'Sist endret',
  changedBy: 'Endret av',
  continueHere: 'Fortsett her',
  newInstance: 'Start på nytt',
  previous: 'Forrige',
  next: 'Neste',
  rowsPerPage: 'Rader per side',
} as const;

export const InstanceSelectionPage = () => {
  const {
    selectedParty: { partyId: selectedPartyId },
  } = useLoaderData() as Awaited<ReturnType<ReturnType<typeof instanceSelectionLoader>>>;
  const instanceSelectionOptions = GlobalData.applicationMetadata.onEntry?.instanceSelection;
  const rowsPerPageOptions = instanceSelectionOptions?.rowsPerPageOptions ?? [10, 25, 50];
  const selectedIndex = instanceSelectionOptions?.defaultSelectedOption;
  const defaultSelectedOption =
    selectedIndex !== undefined && selectedIndex >= 0 && selectedIndex < rowsPerPageOptions.length ? selectedIndex : 0;
  const sortDirection = instanceSelectionOptions?.sortDirection ?? 'asc';
  const { data: instances, isPending } = useActiveInstances({
    instanceOwnerPartyId: selectedPartyId.toString(),
    sortDirection,
  });

  if (!selectedPartyId) {
    throw new Error('no party');
  }

  if (isPending) {
    return <div>loading</div>;
  }

  if (!instances?.length) {
    return <div>loading</div>;
  }
  if (instances?.length && instances?.length < 1) {
    throw new Error('no instances');
  }

  return (
    <InstanceList
      texts={texts}
      instances={instances}
      rowsPerPageOptions={rowsPerPageOptions}
      defaultSelectedOption={defaultSelectedOption}
    />
  );
};
