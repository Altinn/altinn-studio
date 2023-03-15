import { getProfileStateMock } from 'src/__mocks__/profileStateMock';
import { statelessAndAllowAnonymousMock } from 'src/__mocks__/statelessAndAllowAnonymousMock';
import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';
import type { IRuntimeState } from 'src/types';

describe('appLanguageStateSelector', () => {
  interface ISetupProps {
    allowAnonymous: boolean;
    profileLanguage: string;
    selectedLanguage: string;
  }

  const setupState = ({ allowAnonymous, profileLanguage, selectedLanguage }: ISetupProps) => {
    const mockInitialState = statelessAndAllowAnonymousMock(allowAnonymous);
    const mockProfile = getProfileStateMock();
    return {
      ...mockInitialState,
      profile: {
        ...mockProfile,
        profile: {
          ...mockProfile.profile,
          profileSettingPreference: {
            ...mockProfile.profile.profileSettingPreference,
            language: profileLanguage,
          },
        },
        selectedAppLanguage: selectedLanguage,
      },
      language: {
        language: {},
        error: null,
      },
    } satisfies IRuntimeState;
  };

  it('should select profile language when allowAnonymous false and selected language not set', () => {
    const state = setupState({
      allowAnonymous: false,
      profileLanguage: 'nn',
      selectedLanguage: '',
    });
    const appLanguage = appLanguageStateSelector(state);
    expect(appLanguage).toBe('nn');
  });
  it('should select default when allowAnonymous true and selected language not set', () => {
    const state = setupState({
      allowAnonymous: true,
      profileLanguage: 'nn',
      selectedLanguage: '',
    });
    const appLanguage = appLanguageStateSelector(state);
    expect(appLanguage).toBe('nb');
  });
  it('should select selected app language when allowAnonymous true and selected language is set', () => {
    const state = setupState({
      allowAnonymous: true,
      profileLanguage: 'nn',
      selectedLanguage: 'en',
    });
    const appLanguage = appLanguageStateSelector(state);
    expect(appLanguage).toBe('en');
  });
  it('should select selected app language when allowAnonymous false and selected language is set', () => {
    const state = setupState({
      allowAnonymous: false,
      profileLanguage: 'nn',
      selectedLanguage: 'en',
    });
    const appLanguage = appLanguageStateSelector(state);
    expect(appLanguage).toBe('en');
  });
});
