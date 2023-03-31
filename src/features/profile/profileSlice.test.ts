import { getProfileStateMock } from 'src/__mocks__/profileStateMock';
import { initialState, ProfileActions, profileSlice } from 'src/features/profile/profileSlice';
import { createStorageMock } from 'src/testUtils';
import type { IAltinnWindow } from 'src/types';

describe('profileSlice', () => {
  const slice = profileSlice();
  beforeEach(() => {
    const altinnWinow = window as Window as IAltinnWindow;
    Object.defineProperty(altinnWinow, 'localStorage', { value: createStorageMock() });
    altinnWinow.app = 'test-app';
  });
  afterEach(() => {
    window.localStorage.clear();
  });
  it('should set selected app language for user when no userId', () => {
    const nextState = slice.reducer(
      initialState,
      ProfileActions.updateSelectedAppLanguage({
        selected: 'en',
      }),
    );
    expect(window.localStorage.getItem('selectedAppLanguagetest-app')).toEqual('en');
    expect(nextState.selectedAppLanguage).toEqual('en');
  });
  it('should set selected app language for user with userId', () => {
    const nextState = slice.reducer(
      getProfileStateMock(),
      ProfileActions.updateSelectedAppLanguage({
        selected: 'po',
      }),
    );
    expect(window.localStorage.getItem('selectedAppLanguagetest-app12345')).toEqual('po');
    expect(nextState.selectedAppLanguage).toEqual('po');
  });
  it('should use selected app language from localstorage if it exists for user', () => {
    window.localStorage.setItem('selectedAppLanguagetest-app12345', 'nn');
    const nextState = slice.reducer(
      initialState,
      ProfileActions.fetchFulfilled({ profile: getProfileStateMock().profile }),
    );
    expect(nextState.selectedAppLanguage).toEqual('nn');
  });
});
