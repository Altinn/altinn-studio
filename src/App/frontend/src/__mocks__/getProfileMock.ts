import { getPartyMock } from 'src/__mocks__/getPartyMock';
import type { IProfile } from 'src/types/shared';

export function getProfileMock(): IProfile {
  return {
    userId: 12345,
    userName: 'Ola Normann',
    partyId: 12345,
    party: getPartyMock(),
    userType: 1,
    profileSettingPreference: {
      language: 'nb',
      preSelectedPartyId: 12345,
      doNotPromptForParty: false,
    },
  };
}
