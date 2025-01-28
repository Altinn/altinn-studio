import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { getAppTitlesToDisplay } from './getAppTitlesToDisplay';
import type { ServiceNames } from '../types/ServiceNames';

const nb: string = 'nb';
const nn: string = 'nn';
const en: string = 'en';
const se: string = 'se';
const da: string = 'da';

describe('getAppTitlesToDisplay', () => {
  it('returns empty recommended app titles if appMetadataTitles and appLangCodes are empty', () => {
    const appMetadataTitles: KeyValuePairs<string> = {};
    const appLangCodesData: string[] = [];
    const appTitles: ServiceNames = getAppTitlesToDisplay(appMetadataTitles, appLangCodesData);
    expect(appTitles).toEqual({ nb: undefined, nn: undefined, en: undefined });
  });

  it('returns empty recommended app titles if appMetadataTitles is empty and appLangCodes contains them', () => {
    const appMetadataTitles: KeyValuePairs<string> = {};
    const appLangCodesData: string[] = [nb, nn, en];
    const appTitles: ServiceNames = getAppTitlesToDisplay(appMetadataTitles, appLangCodesData);
    expect(appTitles).toEqual({ nb: undefined, nn: undefined, en: undefined });
  });

  it('returns the recommended app titles with values if present in appMetadataTitles', () => {
    const appNameNb: string = 'appNameNb';
    const appMetadataTitles: KeyValuePairs<string> = { nb: appNameNb };
    const appLangCodesData: string[] = [];
    const appTitles: ServiceNames = getAppTitlesToDisplay(appMetadataTitles, appLangCodesData);
    expect(appTitles).toEqual({ nb: appNameNb, nn: undefined, en: undefined });
  });

  it('returns the recommended app titles with values if present in appMetadataTitles and if languages are present in appLangCodesData', () => {
    const appNameNb: string = 'appNameNb';
    const appMetadataTitles: KeyValuePairs<string> = { nb: appNameNb };
    const appLangCodesData: string[] = [nb, nn, en];
    const appTitles: ServiceNames = getAppTitlesToDisplay(appMetadataTitles, appLangCodesData);
    expect(appTitles).toEqual({ nb: appNameNb, nn: undefined, en: undefined });
  });

  it('returns additional empty app titles if languages are present in appLangCodesData', () => {
    const appMetadataTitles: KeyValuePairs<string> = {};
    const appLangCodesData: string[] = [se, da];
    const appTitles: ServiceNames = getAppTitlesToDisplay(appMetadataTitles, appLangCodesData);
    expect(appTitles).toEqual({
      nb: undefined,
      nn: undefined,
      en: undefined,
      se: undefined,
      da: undefined,
    });
  });

  it('returns additional app titles with values if languages are present in appLangCodesData and appMetadataTitles', () => {
    const appNameSe: string = 'appNameSe';
    const appMetadataTitles: KeyValuePairs<string> = { se: appNameSe };
    const appLangCodesData: string[] = [se, da];
    const appTitles: ServiceNames = getAppTitlesToDisplay(appMetadataTitles, appLangCodesData);
    expect(appTitles).toEqual({
      nb: undefined,
      nn: undefined,
      en: undefined,
      se: appNameSe,
      da: undefined,
    });
  });

  it('return additional app title for language if language is not recommended and not in appLangCodes, but in appMetadataTitles', () => {
    const appNameSe: string = 'appNameSe';
    const appMetadataTitles: KeyValuePairs<string> = { se: appNameSe };
    const appLangCodesData: string[] = [];
    const appTitles: ServiceNames = getAppTitlesToDisplay(appMetadataTitles, appLangCodesData);
    expect(appTitles).toEqual({ nb: undefined, nn: undefined, en: undefined, se: appNameSe });
  });
});
