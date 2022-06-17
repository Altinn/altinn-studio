import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import { IRuntimeState } from 'src/types';
import { IProfile } from 'altinn-shared/types';
import { profileStateSelector } from 'src/selectors/simpleSelectors';

const allowAnonymousSelector = makeGetAllowAnonymousSelector();
const selectedAppLanguageStateSelector = (state: IRuntimeState) =>
  state.language.selectedAppLanguage;

export const appLanguageStateSelector = (state: IRuntimeState) => {
  let selectedAppLanguage = selectedAppLanguageStateSelector(state);
  const allowAnonymous = allowAnonymousSelector(state);
  if (!allowAnonymous) {
    // Fallback to profile language if not anonymous
    const profile: IProfile = profileStateSelector(state);
    selectedAppLanguage = selectedAppLanguage || profile.profileSettingPreference.language;
  }
  // Fallback to nb if nothing is set
  return selectedAppLanguage || 'nb';
};
