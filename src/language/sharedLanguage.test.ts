import { staticUseLanguageForTests } from 'src/hooks/useLanguage';
import { getAppName, getAppOwner, getParsedLanguageFromText } from 'src/language/sharedLanguage';
import type { TextResourceMap } from 'src/features/textResources';
import type { IAltinnOrg, IAltinnOrgs, IApplication } from 'src/types/shared';

describe('language.ts', () => {
  describe('getParsedLanguageFromText', () => {
    it('should return single element if only text is parsed', () => {
      const result = getParsedLanguageFromText('just som plain text');
      expect(result instanceof Array).toBeFalsy();
    });

    it('should return array of nodes for more complex markdown', () => {
      const result = getParsedLanguageFromText('# Header \n With some text');
      expect(result instanceof Array).toBeTruthy();
    });
  });

  describe('getAppName', () => {
    it('should return app name if defined by appName key', () => {
      const textResources: TextResourceMap = {
        appName: {
          value: 'SomeAppName',
        },
      };

      const result = getAppName({} as IApplication, staticUseLanguageForTests({ textResources }));
      const expectedResult = 'SomeAppName';
      expect(result).toEqual(expectedResult);
    });

    it('should return app name if defined by ServiceName key', () => {
      const textResources: TextResourceMap = {
        ServiceName: {
          value: 'SomeAppName',
        },
      };

      const result = getAppName({} as IApplication, staticUseLanguageForTests({ textResources }));
      const expectedResult = 'SomeAppName';
      expect(result).toEqual(expectedResult);
    });

    it('should return appName if defined in applicationMetadata and not by text resource keys', () => {
      const textResources: TextResourceMap = {};
      const applicationMetadata = {
        title: {
          nb: 'SomeAppName',
        },
      } as unknown as IApplication;

      const result = getAppName(applicationMetadata, staticUseLanguageForTests({ textResources }));
      const expectedResult = 'SomeAppName';
      expect(result).toEqual(expectedResult);
    });

    it('should return app name defined by appName key even if applicationMetadata definition exist', () => {
      const textResources: TextResourceMap = {
        appName: {
          value: 'AppNameFromTextResource',
        },
      };
      const applicationMetadata = {
        title: {
          nb: 'AppNameFromMetadata',
        },
      } as unknown as IApplication;

      const result = getAppName(applicationMetadata, staticUseLanguageForTests({ textResources }));
      const expectedResult = 'AppNameFromTextResource';
      expect(result).toEqual(expectedResult);
    });

    it('should return app name defined by ServiceName key even if applicationMetadata definition exist', () => {
      const textResources: TextResourceMap = {
        ServiceName: {
          value: 'AppNameFromTextResource',
        },
      };
      const applicationMetadata = {
        title: {
          nb: 'AppNameFromMetadata',
        },
      } as unknown as IApplication;

      const result = getAppName(applicationMetadata, staticUseLanguageForTests({ textResources }));
      const expectedResult = 'AppNameFromTextResource';
      expect(result).toEqual(expectedResult);
    });

    it('should fall back to nb-key from appMetadata if userLanguage is not present in application.title and no text resources exist', () => {
      const textResources: TextResourceMap = {};
      const applicationMetadata = {
        title: {
          nb: 'NorwegianName',
        },
      } as unknown as IApplication;

      const result = getAppName(applicationMetadata, staticUseLanguageForTests({ textResources }));
      const expectedResult = 'NorwegianName';
      expect(result).toEqual(expectedResult);
    });

    it('should return undefined string if neither defined in textResources and applicationMetadata not set', () => {
      const result = getAppName(null, staticUseLanguageForTests());
      expect(result).toBeUndefined();
    });
  });

  describe('getAppOwner', () => {
    it('should return app owner if defined by appOwner key', () => {
      const textResources: TextResourceMap = {
        appOwner: {
          value: 'NameFromResources',
        },
      };
      const orgs: IAltinnOrgs = {
        ttd: {
          name: { nb: 'NameFromOrg' },
        } as unknown as IAltinnOrg,
      };
      const result = getAppOwner(orgs, 'ttd', staticUseLanguageForTests({ textResources }));
      const expectedResult = 'NameFromResources';
      expect(result).toEqual(expectedResult);
    });

    it('should fall back on altinn-orgs if no text resource is defined', () => {
      const textResources: TextResourceMap = {};
      const orgs: IAltinnOrgs = {
        ttd: {
          name: { nb: 'NameFromOrg' },
        } as unknown as IAltinnOrg,
      };
      const result = getAppOwner(orgs, 'ttd', staticUseLanguageForTests({ textResources }));
      const expectedResult = 'NameFromOrg';
      expect(result).toEqual(expectedResult);
    });

    it('should return undefined value is not set by appOwner key and no text defined in org', () => {
      const textResources: TextResourceMap = {};
      const result = getAppOwner({}, 'ttd', staticUseLanguageForTests({ textResources }));
      expect(result).toEqual(undefined);
    });
  });
});
