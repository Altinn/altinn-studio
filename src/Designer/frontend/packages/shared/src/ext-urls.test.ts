import { altinnDocsUrl, grafanaPodLogsUrl } from './ext-urls';

describe('altinnDocsUrl', () => {
  it('should return the URL with the default language "nb" when no language is provided', () => {
    const result = altinnDocsUrl();
    expect(result).toBe('https://docs.altinn.studio/nb/');
  });

  it('should return the URL with the provided relativeUrl and default language "nb"', () => {
    const result = altinnDocsUrl({ relativeUrl: 'getting-started' });
    expect(result).toBe('https://docs.altinn.studio/nb/getting-started');
  });

  it('should return the URL with language "nb" and relativeUrl', () => {
    const result = altinnDocsUrl({ relativeUrl: 'guide/overview', language: 'nb' });
    expect(result).toBe('https://docs.altinn.studio/nb/guide/overview');
  });

  it('should return the URL with language "en" and relativeUrl without the language in the URL path', () => {
    const result = altinnDocsUrl({ relativeUrl: 'guide/overview', language: 'en' });
    expect(result).toBe('https://docs.altinn.studio/guide/overview');
  });

  it('should return the URL with language "en" and no relativeUrl', () => {
    const result = altinnDocsUrl({ language: 'en' });
    expect(result).toBe('https://docs.altinn.studio/');
  });
});

describe('grafanaPodLogsUrl', () => {
  it('should return the production URL when env is production', () => {
    const result = grafanaPodLogsUrl({
      org: 'ttd',
      env: 'production',
      app: 'app',
      isProduction: true,
      deployStartTime: 1,
      deployFinishTime: 2,
    });

    expect(result).toBe(
      'https://ttd.apps.altinn.no/monitor/d/ae1906c2hbjeoe/pod-console-error-logs?var-rg=altinnapps-ttd-prod-rg&var-PodName=ttd-app-deployment-v2&from=1&to=2',
    );
  });

  it('should return the tt02 URL when env is tt02', () => {
    const result = grafanaPodLogsUrl({
      org: 'ttd',
      env: 'tt02',
      app: 'app',
      isProduction: false,
      deployStartTime: 1,
      deployFinishTime: 2,
    });

    expect(result).toBe(
      'https://ttd.apps.tt02.altinn.no/monitor/d/ae1906c2hbjeoe/pod-console-error-logs?var-rg=altinnapps-ttd-tt02-rg&var-PodName=ttd-app-deployment-v2&from=1&to=2',
    );
  });

  it('should not return from and to parameters when undefined', () => {
    const result = grafanaPodLogsUrl({
      org: 'ttd',
      env: 'tt02',
      app: 'app',
      isProduction: false,
    });

    expect(result).toBe(
      'https://ttd.apps.tt02.altinn.no/monitor/d/ae1906c2hbjeoe/pod-console-error-logs?var-rg=altinnapps-ttd-tt02-rg&var-PodName=ttd-app-deployment-v2',
    );
  });
});
