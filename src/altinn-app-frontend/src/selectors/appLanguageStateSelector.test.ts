import { getProfileStateMock } from '../../__mocks__/profileStateMock';
import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';
import { statelessAndAllowAnonymousMock } from '../../__mocks__/statelessAndAllowAnonymousMock';

describe('appLanguageStateSelector', () => {
  interface ISetupProps {
    allowAnonymous: boolean,
    profileLanguage: string,
    selectedLanguage: string
  }

  const setupState = ({ allowAnonymous, profileLanguage, selectedLanguage }: ISetupProps) => {
    const mockInitialState = statelessAndAllowAnonymousMock(allowAnonymous)
    const mockProfile = getProfileStateMock();
    return {
      ...mockInitialState,
      profile: {
        ...mockProfile,
        profile: {
          ...mockProfile.profile,
          profileSettingPreference: { ...mockProfile.profile.profileSettingPreference, language: profileLanguage },
        },
      },
      language: {
        language: {},
        error: null,
        selectedAppLanguage: selectedLanguage,
      },
    }
  };

  it('should select profile language when allowAnonymous false and selected language not set', () => {
    const state = setupState({ allowAnonymous: false, profileLanguage: 'nn', selectedLanguage: '' });
    const appLanguage = appLanguageStateSelector(state);
    expect(appLanguage).toBe('nn');
  });
  it('should select default when allowAnonymous true and selected language not set', () => {
    const state = setupState({ allowAnonymous: true, profileLanguage: 'nn', selectedLanguage: '' });
    const appLanguage = appLanguageStateSelector(state);
    expect(appLanguage).toBe('nb');
  });
  it('should select selected app language when allowAnonymous true and selected language is set', () => {
    const state = setupState({ allowAnonymous: true, profileLanguage: 'nn', selectedLanguage: 'en' });
    const appLanguage = appLanguageStateSelector(state);
    expect(appLanguage).toBe('en');
  });
  it('should select selected app language when allowAnonymous false and selected language is set', () => {
    const state = setupState({ allowAnonymous: false, profileLanguage: 'nn', selectedLanguage: 'en' });
    const appLanguage = appLanguageStateSelector(state);
    expect(appLanguage).toBe('en');
  });
});
