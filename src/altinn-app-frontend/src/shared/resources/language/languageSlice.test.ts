import slice, { initialState, LanguageActions } from './languageSlice';
import type { ILanguageState } from './languageSlice';

describe('languageSlice', () => {
  let state: ILanguageState;
  beforeEach(() => {
    state = initialState;
  });

  it('handles fetchLanguageFulfilled action', () => {
    const nextState = slice.reducer(
      state,
      LanguageActions.fetchLanguageFulfilled({
        language: {
          testKey: 'test',
        },
      }),
    );
    expect(nextState.language.testKey).toEqual('test');
    expect(nextState.error).toBeNull();
  });

  it('handles fetchLanguageRejected action', () => {
    const errorMessage = 'This is an error';
    const nextState = slice.reducer(
      state,
      LanguageActions.fetchLanguageRejected({
        error: new Error(errorMessage),
      }),
    );
    expect(nextState.language).toBeNull();
    expect(nextState.error.message).toEqual(errorMessage);
  });
});
