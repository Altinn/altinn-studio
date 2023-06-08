import { useAppSelector } from 'src/hooks/useAppSelector';
import { useInstanceIdParams } from 'src/hooks/useInstanceIdParams';

export function useAlwaysPromptForParty(): boolean | null {
  const { partyId: partyIdFromUrl } = useInstanceIdParams();
  const applicationMetadata = useAppSelector((state) => state.applicationMetadata.applicationMetadata);
  const profile = useAppSelector((state) => state.profile.profile);
  const parties = useAppSelector((state) => state.party.parties);

  if (!profile.partyId || parties === null) {
    return null;
  }

  if (!window.featureToggles.doNotPromptForPartyPreference) {
    return false;
  }

  if (applicationMetadata?.promptForParty === 'never') {
    return false;
  }

  if (applicationMetadata?.promptForParty === 'always') {
    return true;
  }

  // No point in prompting if there is only one party
  if (parties.length === 1) {
    return false;
  }

  return !partyIdFromUrl && !profile.profileSettingPreference.doNotPromptForParty;
}
