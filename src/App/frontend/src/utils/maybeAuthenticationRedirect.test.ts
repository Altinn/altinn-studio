import { isAuthenticationRedirectError } from 'src/utils/maybeAuthenticationRedirect';

function stepUpError(data: unknown = { RequiredAuthenticationLevel: '3' }) {
  return { isAxiosError: true, response: { status: 403, data } };
}

describe('isAuthenticationRedirectError', () => {
  it('recognizes a 403 that requires a higher authentication level', () => {
    expect(isAuthenticationRedirectError(stepUpError())).toBe(true);
  });

  it.each([
    ['a plain error', new Error('boom')],
    ['a 403 without RequiredAuthenticationLevel', stepUpError({})],
    ['a non-403 axios error', { isAxiosError: true, response: { status: 500, data: {} } }],
  ])('does not recognize %s', (_name, error) => {
    expect(isAuthenticationRedirectError(error)).toBe(false);
  });

  it('does not recognize it when no step-up url is configured', () => {
    window.altinnAppGlobalData.platformFrontendSettings.upgradeAuthenticationLevelUrl = undefined;
    expect(isAuthenticationRedirectError(stepUpError())).toBe(false);
  });
});
