import type {
  ITextResource,
  IDataSources,
  IDataSource,
  IApplicationSettings,
  IInstanceContext,
  IAltinnOrg,
  IAltinnOrgs,
  IApplication,
} from '../../src/types';
import {
  getAppName,
  getAppOwner,
  getParsedLanguageFromText,
  getTextResourceByKey,
  replaceTextResourceParams,
} from './language';

describe('language.ts', () => {
  const adjectiveValue = 'awesome';
  const colorValue = 'yellow';
  const animal0Value = 'dog';
  const animal1Value = 'cat';
  const homeBaseUrl = 'https://www.testdirektoratet.no';
  const instanceOwnerPartyId = '234323';
  const mockDataSource: IDataSource = {
    'model.text.adjective': adjectiveValue,
    'model.text.color': colorValue,
    'model.group[0].animal': animal0Value,
    'model.group[1].animal': animal1Value,
  };
  const mockApplicationSettings: IApplicationSettings = {
    homeBaseUrl: homeBaseUrl,
  };
  const mockInstanceContext = {
    instanceOwnerPartyId: instanceOwnerPartyId,
  } as IInstanceContext;
  const mockDataSources: IDataSources = {
    dataModel: mockDataSource,
    applicationSettings: mockApplicationSettings,
    instanceContext: mockInstanceContext,
  };

  describe('replaceTextResourceParams', () => {
    it('should replace parameter for unparsed value', () => {
      const mockTextResources: ITextResource[] = [
        {
          id: 'mockId1',
          value: 'This is an {0} text.',
          unparsedValue: 'This is an {0} text.',
          variables: [{ key: 'model.text.adjective', dataSource: 'dataModel.test' }],
        },
      ];
      const replacedResources = replaceTextResourceParams(mockTextResources, mockDataSources);
      const textResource = replacedResources.find((resource: ITextResource) => resource.id === 'mockId1');
      expect(textResource?.value).toEqual(`This is an ${adjectiveValue} text.`);
    });

    it('should replace multiple parameters', () => {
      const mockTextResources: ITextResource[] = [
        {
          id: 'mockId1',
          value: 'This is an {0} text, {1}.',
          unparsedValue: 'This is an {0} text, {1}.',
          variables: [
            { key: 'model.text.adjective', dataSource: 'dataModel.test' },
            { key: 'model.text.color', dataSource: 'dataModel.test' },
          ],
        },
      ];

      const replacedResources = replaceTextResourceParams(mockTextResources, mockDataSources);
      const textResource = replacedResources.find((resource) => resource.id === 'mockId1');
      expect(textResource?.value).toEqual(`This is an ${adjectiveValue} text, ${colorValue}.`);
    });

    it('should replace parameter for previously parsed value', () => {
      const mockTextResources: ITextResource[] = [
        {
          id: 'mockId',
          value: 'This is a green apple.',
          unparsedValue: 'This is a {0} apple.',
          variables: [{ key: 'model.text.color', dataSource: 'dataModel.test' }],
        },
      ];
      const replacedResources = replaceTextResourceParams(mockTextResources, mockDataSources);
      const textResource = replacedResources.find((resource: ITextResource) => resource.id === 'mockId');
      expect(textResource?.value).toEqual(`This is a ${colorValue} apple.`);
    });

    it('should replace parameter with text key', () => {
      const mockTextResources: ITextResource[] = [
        {
          id: 'mockId',
          value: 'This is a text with a missing param: {0}.',
          unparsedValue: 'This is a text with a missing param: {0}.',
          variables: [{ key: 'model.text.param', dataSource: 'dataModel.test' }],
        },
      ];
      const replacedResources = replaceTextResourceParams(mockTextResources, mockDataSources);
      const textResource = replacedResources.find((resource: ITextResource) => resource.id === 'mockId');
      expect(textResource?.value).toEqual('This is a text with a missing param: model.text.param.');
    });

    it('should not replace the texts from invalid source', () => {
      const mockTextResources: ITextResource[] = [
        {
          id: 'mockId',
          value: 'This: {0} depends on an invalid source.',
          unparsedValue: 'This: {0} depends on an invalid source.',
          variables: [{ key: 'model.text.adjective', dataSource: 'api.invalidSource' }],
        },
      ];
      const replacedResources = replaceTextResourceParams(mockTextResources, mockDataSources);
      const textResource = replacedResources.find((resource: ITextResource) => resource.id === 'mockId');
      expect(textResource?.value).toEqual('This: {0} depends on an invalid source.');
    });

    it('should not replace texts when no variable is defined', () => {
      const mockTextResources: ITextResource[] = [
        {
          id: 'mockId',
          value: 'mock value',
          unparsedValue: 'mock value',
          variables: undefined,
        },
      ];
      const replacedResources = replaceTextResourceParams(mockTextResources, mockDataSources);
      const textResource = replacedResources.find((resource: ITextResource) => resource.id === 'mockId');
      expect(textResource?.value).toEqual('mock value');
    });

    it('should replace texts for repeating groups', () => {
      const mockTextResources: ITextResource[] = [
        {
          id: 'mockId',
          value: 'Hello, {0}!',
          unparsedValue: 'Hello, {0}!',
          variables: [
            {
              key: 'model.group[{0}].animal',
              dataSource: 'dataModel.mockDataDource',
            },
          ],
        },
      ];
      const mockRepeatingGroups = {
        group1: {
          index: 1,
          dataModelBinding: 'model.group',
        },
      };
      const replacedResources = replaceTextResourceParams(mockTextResources, mockDataSources, mockRepeatingGroups);
      let textResource = replacedResources.find((resource) => resource.id === 'mockId-0');
      expect(textResource?.value).toEqual(`Hello, ${animal0Value}!`);
      textResource = replacedResources.find((resource) => resource.id === 'mockId-1');
      expect(textResource?.value).toEqual(`Hello, ${animal1Value}!`);
    });

    it('should replace multiple references to same value', () => {
      const mockTextResources: ITextResource[] = [
        {
          id: 'mockId',
          value: 'This is a {0} apple. It will always be {0}. Yes, {0} is my favorite color.',
          unparsedValue: 'This is a {0} apple. It will always be {0}. Yes, {0} is my favorite color.',
          variables: [{ key: 'model.text.color', dataSource: 'dataModel.test' }],
        },
      ];
      const replacedResources = replaceTextResourceParams(mockTextResources, mockDataSources);
      const textResource = replacedResources.find((resource: ITextResource) => resource.id === 'mockId');
      expect(textResource?.value).toEqual(
        `This is a ${colorValue} apple. It will always be ${colorValue}. Yes, ${colorValue} is my favorite color.`,
      );
    });

    it('should replace text based on appsettings', () => {
      const mockTextResources: ITextResource[] = [
        {
          id: 'mockId',
          value: 'This is a [link]({0}).',
          unparsedValue: 'This is a [link]({0}).',
          variables: [{ key: 'homeBaseUrl', dataSource: 'applicationSettings' }],
        },
      ];
      const replacedResources = replaceTextResourceParams(mockTextResources, mockDataSources);
      const textResource = replacedResources.find((resource: ITextResource) => resource.id === 'mockId');
      expect(textResource?.value).toEqual(`This is a [link](${homeBaseUrl}).`);
    });

    it('should replace text with key when appsettings value is missing', () => {
      const mockTextResources: ITextResource[] = [
        {
          id: 'mockId',
          value: 'This is a [link]({0}).',
          unparsedValue: 'This is a [link]({0}).',
          variables: [{ key: 'doesnotexists', dataSource: 'applicationSettings' }],
        },
      ];
      const replacedResources = replaceTextResourceParams(mockTextResources, mockDataSources);
      const textResource = replacedResources.find((resource: ITextResource) => resource.id === 'mockId');
      expect(textResource?.value).toEqual(`This is a [link](doesnotexists).`);
    });

    it('should replace text from instance context', () => {
      const mockTextResources: ITextResource[] = [
        {
          id: 'mockId',
          value: 'The instance owner party id is {0}',
          unparsedValue: 'The instance owner party id is {0}',
          variables: [{ key: 'instanceOwnerPartyId', dataSource: 'instanceContext' }],
        },
      ];
      const replacedResources = replaceTextResourceParams(mockTextResources, mockDataSources);
      const textResource = replacedResources.find((resource: ITextResource) => resource.id === 'mockId');
      expect(textResource?.value).toEqual(`The instance owner party id is ${instanceOwnerPartyId}`);
    });

    it('should replace text in a reapeating group based on appsettings', () => {
      const mockTextResources: ITextResource[] = [
        {
          id: 'mockId',
          value: 'This is a [link]({0}).',
          unparsedValue: 'This is a [link]({0}).',
          variables: [{ key: 'homeBaseUrl', dataSource: 'applicationSettings' }],
        },
      ];
      const mockRepeatingGroups = {
        group1: {
          index: 1,
          dataModelBinding: 'model.group',
        },
      };
      const replacedResources = replaceTextResourceParams(mockTextResources, mockDataSources, mockRepeatingGroups);
      const textResource = replacedResources.find((resource: ITextResource) => resource.id === 'mockId');
      expect(textResource?.value).toEqual(`This is a [link](${homeBaseUrl}).`);
    });
  });

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
      const textResources: ITextResource[] = [
        {
          value: 'SomeAppName',
          id: 'appName',
        },
      ];

      const result = getAppName(textResources, {} as IApplication, 'nb');
      const expectedResult = 'SomeAppName';
      expect(result).toEqual(expectedResult);
    });

    it('should return app name if defined by ServiceName key', () => {
      const textResources: ITextResource[] = [
        {
          value: 'SomeAppName',
          id: 'ServiceName',
        },
      ];

      const result = getAppName(textResources, {} as IApplication, 'nb');
      const expectedResult = 'SomeAppName';
      expect(result).toEqual(expectedResult);
    });

    it('should return appName if defined in applicationMetadata and not by text resource keys', () => {
      const textResources: ITextResource[] = [];
      const applicationMetadata = {
        title: {
          nb: 'SomeAppName',
        },
      } as unknown as IApplication;

      const result = getAppName(textResources, applicationMetadata, 'nb');
      const expectedResult = 'SomeAppName';
      expect(result).toEqual(expectedResult);
    });

    it('should return app name defined by appName key even if applicationMetadata definition exist', () => {
      const textResources: ITextResource[] = [
        {
          value: 'AppNameFromTextResource',
          id: 'appName',
        },
      ];
      const applicationMetadata = {
        title: {
          nb: 'AppNameFromMetadata',
        },
      } as unknown as IApplication;

      const result = getAppName(textResources, applicationMetadata, 'nb');
      const expectedResult = 'AppNameFromTextResource';
      expect(result).toEqual(expectedResult);
    });

    it('should return app name defined by ServiceName key even if applicationMetadata definition exist', () => {
      const textResources: ITextResource[] = [
        {
          value: 'AppNameFromTextResource',
          id: 'ServiceName',
        },
      ];
      const applicationMetadata = {
        title: {
          nb: 'AppNameFromMetadata',
        },
      } as unknown as IApplication;

      const result = getAppName(textResources, applicationMetadata, 'nb');
      const expectedResult = 'AppNameFromTextResource';
      expect(result).toEqual(expectedResult);
    });

    it('should fall back to nb-key from appMetadata if userLanguage is not present in application.title and no text resources exist', () => {
      const textResources: ITextResource[] = [];
      const applicationMetadata = {
        title: {
          nb: 'NorwegianName',
        },
      } as unknown as IApplication;

      const result = getAppName(textResources, applicationMetadata, 'en');
      const expectedResult = 'NorwegianName';
      expect(result).toEqual(expectedResult);
    });

    it('should return undefined string if neither defined in textResources and applicationMetadata not set', () => {
      const result = getAppName([], null, 'nb');
      expect(result).toBeUndefined();
    });
  });

  describe('getAppOwner', () => {
    it('should return app owner if defined by appOwner key', () => {
      const textResources: ITextResource[] = [
        {
          value: 'NameFromResources',
          id: 'appOwner',
        },
      ];
      const orgs: IAltinnOrgs = {
        ttd: {
          name: { nb: 'NameFromOrg' },
        } as unknown as IAltinnOrg,
      };
      const result = getAppOwner(textResources, orgs, 'ttd', 'nb');
      const expectedResult = 'NameFromResources';
      expect(result).toEqual(expectedResult);
    });

    it('should fall back on altinn-orgs if no text resource is defined', () => {
      const textResources: ITextResource[] = [];
      const orgs: IAltinnOrgs = {
        ttd: {
          name: { nb: 'NameFromOrg' },
        } as unknown as IAltinnOrg,
      };
      const result = getAppOwner(textResources, orgs, 'ttd', 'nb');
      const expectedResult = 'NameFromOrg';
      expect(result).toEqual(expectedResult);
    });

    it('should return undefined value is not set by appOwner key and no text defined in org', () => {
      const textResources: ITextResource[] = [];
      const result = getAppOwner(textResources, {}, 'ttd', 'nb');
      expect(result).toEqual(undefined);
    });
  });

  describe('textResource', () => {
    let mockTextResources: ITextResource[];
    let mockKey: string;
    let mockInvalidKey: string;
    beforeEach(() => {
      mockTextResources = [
        {
          id: 'mockId1',
          value: 'mock value 1',
          unparsedValue: 'mock value 1',
          variables: undefined,
        },
        {
          id: 'mockId2',
          value: 'mock value 2',
          unparsedValue: 'mock value 2',
          variables: undefined,
        },
        {
          id: 'mockId3',
          value: 'mockId1',
          unparsedValue: 'mockId1',
          variables: undefined,
        },
      ];
      mockKey = 'mockId1';
      mockInvalidKey = 'invalid';
    });

    it('should return correct value for a given key', () => {
      const result = getTextResourceByKey(mockKey, mockTextResources);
      expect(result).toBe(mockTextResources[0].value);
    });

    it('should return the key if a value does not exist for the given key', () => {
      const result = getTextResourceByKey(mockInvalidKey, mockTextResources);
      expect(result).toBe(mockInvalidKey);
    });

    it('should return key if mockTextResources are null', () => {
      const result = getTextResourceByKey(mockKey, null);
      expect(result).toBe(mockKey);
    });

    it('should return key of key if present', () => {
      const result = getTextResourceByKey('mockId3', mockTextResources);
      expect(result).toBe(mockTextResources[0].value);
    });
  });
});
