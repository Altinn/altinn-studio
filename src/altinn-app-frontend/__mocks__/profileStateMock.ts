import type { IProfileState } from '../src/shared/resources/profile';
import { partyMock } from './partyMock';

export function getProfileStateMock(
  customStates?: Partial<IProfileState>,
): IProfileState {
  const profileStateMock = {
    error: null,
    profile: {
      userId: 12345,
      userName: 'Ola Normann',
      partyId: 12345,
      party: partyMock,
      userType: 1,
      profileSettingPreference: {
        language: 'nb',
        preSelectedPartyId: 12345,
        doNotPromptForParty: false,
      },
    },
  };

  return {
    ...profileStateMock,
    ...customStates,
  };
}
