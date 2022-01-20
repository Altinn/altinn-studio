import 'jest';
import { ITextResource, IDataSources, IDataSource, IApplication, IAltinnOrgs, IAltinnOrg } from '../../src/types';
import { getAppName, getAppOwner, getParsedLanguageFromText, replaceTextResourceParams } from '../../src/utils/language';

describe('>>> src/Altinn.Apps/AppFrontend/react/shared/src/utils/language.ts', () => {
  let mockTextResources: ITextResource[];
  let mockDataSources: IDataSources;
  let mockDataSource: IDataSource;
  let adjectiveValue: string;
  let colorValue: string;
  let animal0Value: string;
  let animal1Value: string;

  beforeEach(() => {
    adjectiveValue = 'awesome';
    colorValue = 'yellow';
    animal0Value = 'dog';
    animal1Value = 'cat';
    mockDataSource = {
      'model.text.adjective': adjectiveValue,
      'model.text.color': colorValue,
      'model.group[0].animal': animal0Value,
      'model.group[1].animal': animal1Value,
    };
    mockDataSources = {
      dataModel: mockDataSource,
    };
    mockTextResources = [];
  });

  it('+++ should replace parameter for unparsed value', () => {
    mockTextResources = [
      {
        id: 'mockId1', value: 'This is an {0} text.', unparsedValue: 'This is an {0} text.', variables: [{ key: 'model.text.adjective', dataSource: 'dataModel.test' }],
      },
    ];
    replaceTextResourceParams(mockTextResources, mockDataSources);
    const textResource = mockTextResources.find((resource: ITextResource) => resource.id === 'mockId1');
    expect(textResource.value).toEqual(`This is an ${adjectiveValue} text.`);
  });

  it('+++ should replace multiple parameters', () => {
    mockTextResources = [
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

    replaceTextResourceParams(mockTextResources, mockDataSources);
    const textResource = mockTextResources.find((resource) => resource.id === 'mockId1');
    expect(textResource.value).toEqual(`This is an ${adjectiveValue} text, ${colorValue}.`);
  });

  it('+++ should replace parameter for previously parsed value', () => {
    mockTextResources = [
      {
        id: 'mockId', value: 'This is a green apple.', unparsedValue: 'This is a {0} apple.', variables: [{ key: 'model.text.color', dataSource: 'dataModel.test' }],
      },
    ];
    replaceTextResourceParams(mockTextResources, mockDataSources);
    const textResource = mockTextResources.find((resource: ITextResource) => resource.id === 'mockId');
    expect(textResource.value).toEqual(`This is a ${colorValue} apple.`);
  });

  it('+++ should replace parameter with text key', () => {
    mockTextResources = [
      {
        id: 'mockId', value: 'This is a text with a missing param: {0}.', unparsedValue: 'This is a text with a missing param: {0}.', variables: [{ key: 'model.text.param', dataSource: 'dataModel.test' }],
      },
    ];
    replaceTextResourceParams(mockTextResources, mockDataSources);
    const textResource = mockTextResources.find((resource: ITextResource) => resource.id === 'mockId');
    expect(textResource.value).toEqual('This is a text with a missing param: model.text.param.');
  });

  it('+++ should not replace the texts from invalid source', () => {
    mockTextResources = [
      {
        id: 'mockId', value: 'This: {0} depends on an invalid source.', unparsedValue: 'This: {0} depends on an invalid source.', variables: [{ key: 'model.text.adjective', dataSource: 'api.invalidSource' }],
      },
    ];
    replaceTextResourceParams(mockTextResources, mockDataSources);
    const textResource = mockTextResources.find((resource: ITextResource) => resource.id === 'mockId');
    expect(textResource.value).toEqual('This: {0} depends on an invalid source.');
  });

  it('+++ should not replace texts when no variable is defined', () => {
    mockTextResources = [
      {
        id: 'mockId', value: 'mock value', unparsedValue: 'mock value', variables: undefined,
      },
    ];
    replaceTextResourceParams(mockTextResources, mockDataSources);
    const textResource = mockTextResources.find((resource: ITextResource) => resource.id === 'mockId');
    expect(textResource.value).toEqual('mock value');
  });

  it('+++ should replace texts for repeating groups', () => {
    mockTextResources = [
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
        count: 1,
        dataModelBinding: 'model.group',
      },
    };
    replaceTextResourceParams(mockTextResources, mockDataSources, mockRepeatingGroups);
    let textResource = mockTextResources.find((resource) => resource.id === 'mockId-0');
    expect(textResource.value).toEqual(`Hello, ${animal0Value}!`);
    textResource = mockTextResources.find((resource) => resource.id === 'mockId-1');
    expect(textResource.value).toEqual(`Hello, ${animal1Value}!`);
  });

  it('+++ should replace multiple references to same value', () => {
    mockTextResources = [
      {
        id: 'mockId',
        value: 'This is a {0} apple. It will always be {0}. Yes, {0} is my favorite color.',
        unparsedValue: 'This is a {0} apple. It will always be {0}. Yes, {0} is my favorite color.',
        variables: [
          { key: 'model.text.color', dataSource: 'dataModel.test' },
        ],
      },
    ];
    replaceTextResourceParams(mockTextResources, mockDataSources);
    const textResource = mockTextResources.find((resource: ITextResource) => resource.id === 'mockId');
    expect(textResource.value).toEqual(`This is a ${colorValue} apple. It will always be ${colorValue}. Yes, ${colorValue} is my favorite color.`);
  });

  describe('getParsedLanguageFromText', () => {
    it('should return single element if only text is parsed', () => {
      const result = getParsedLanguageFromText('just som plain text')
      expect(result instanceof Array).toBeFalsy();
    });

    it('should return array of nodes for more complex markdown', () => {
      const result = getParsedLanguageFromText('# Header \n With some text');
      expect(result instanceof Array).toBeTruthy();
    });
  });

  describe('getAppName', () => {
    it('should return app name if defined by appName key', () => {
        const textResources: ITextResource[] = [{
          value: 'SomeAppName',
          id: 'appName',
        }];

        const result = getAppName(textResources, {} as IApplication, 'nb');
        const expectedResult = 'SomeAppName';
        expect(result).toEqual(expectedResult);
    });

    it('should return app name if defined by ServiceName key', () => {
      const textResources: ITextResource[] = [{
        value: 'SomeAppName',
        id: 'ServiceName',
      }];

      const result = getAppName(textResources, {} as IApplication, 'nb');
      const expectedResult = 'SomeAppName';
      expect(result).toEqual(expectedResult);
    });

    it('should return appName if defined in applicationMetadata and not by text resource keys', () => {
      const textResources: ITextResource[] = [];
      const applicationMetadata = {
        title: {
          nb: 'SomeAppName',
        }
      } as unknown as IApplication;

      const result = getAppName(textResources, applicationMetadata, 'nb');
      const expectedResult = 'SomeAppName';
      expect(result).toEqual(expectedResult);
    });

    it('should return app name defined by appName key even if applicationMetadata definition exist', () => {
      const textResources: ITextResource[] = [{
        value: 'AppNameFromTextResource',
        id: 'appName',
      }];
      const applicationMetadata = {
        title: {
          nb: 'AppNameFromMetadata',
        }
      } as unknown as IApplication;

      const result = getAppName(textResources, applicationMetadata, 'nb');
      const expectedResult = 'AppNameFromTextResource';
      expect(result).toEqual(expectedResult);
    });

    it('should return app name defined by ServiceName key even if applicationMetadata definition exist', () => {
      const textResources: ITextResource[] = [{
        value: 'AppNameFromTextResource',
        id: 'ServiceName',
      }];
      const applicationMetadata = {
        title: {
          nb: 'AppNameFromMetadata',
        }
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
        }
      } as unknown as IApplication;

      const result = getAppName(textResources, applicationMetadata, 'en');
      const expectedResult = 'NorwegianName';
      expect(result).toEqual(expectedResult);
    });

    it('should return undefined string if neither defined in textResources and applicationMetadata not set', () => {
      const result = getAppName([], null, 'nb');
      const expectedResult: string = undefined;
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getAppOwner', () => {
    it('should return app owner if defined by appOwner key', () => {
      const textResources: ITextResource[] = [{
        value: 'NameFromResources',
        id: 'appOwner',
      }];
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
});
