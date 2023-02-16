import { initialState, LanguageActions, languageSlice } from 'src/shared/resources/language/languageSlice';
import type { ILanguageState } from 'src/shared/resources/language/languageSlice';

describe('languageSlice', () => {
  let state: ILanguageState;
  beforeEach(() => {
    state = initialState;
  });

  it('handles fetchLanguageFulfilled action', () => {
    const nextState = languageSlice.reducer(
      state,
      LanguageActions.fetchLanguageFulfilled({
        language: {
          testKey: 'test',
        },
      }),
    );
    expect(nextState.language?.testKey).toEqual('test');
    expect(nextState.error).toBeNull();
  });

  it('handles fetchLanguageRejected action', () => {
    const errorMessage = 'This is an error';
    const nextState = languageSlice.reducer(
      state,
      LanguageActions.fetchLanguageRejected({
        error: new Error(errorMessage),
      }),
    );
    expect(nextState.language).toBeNull();
    expect(nextState.error?.message).toEqual(errorMessage);
  });
});
