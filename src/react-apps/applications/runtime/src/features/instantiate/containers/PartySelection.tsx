import * as React from 'react';
import { useSelector } from 'react-redux';
import { IRuntimeState } from 'src/types';
import Header from '../../../shared/components/altinnAppHeader';
import PartyActions from '../../../shared/resources/party/partyActions';

export default function() {
  const language = useSelector((state: IRuntimeState) => state.language.language);
  const profile = useSelector((state: IRuntimeState) => state.profile.profile);
  const parties = useSelector((state: IRuntimeState) => state.party);

  React.useEffect(() => {
    PartyActions.getParties(`${window.location.origin}/api/v1/party`);
  }, []);

  return (
    <>
      <Header
        language={language}
        profile={profile}
      />
    </>
  );
}
