import {
  getMissingInputLanguageString,
  mapLanguageKeyToLanguageText,
  deepCompare,
  getEnvLabel,
  mapKeywordStringToKeywordTypeArray,
  validateResource,
  getMigrationErrorMessage,
} from './';
import type { EnvId } from './resourceUtils';
import type { Resource, ResourceError, SupportedLanguage } from 'app-shared/types/ResourceAdm';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

describe('mapKeywordStringToKeywordTypeArray', () => {
  it('should split keywords correctly', () => {
    const keywords = mapKeywordStringToKeywordTypeArray('test,,,,comma, hei,meh,');
    expect(keywords).toStrictEqual([
      { word: 'test', language: 'nb' },
      { word: 'comma', language: 'nb' },
      { word: 'hei', language: 'nb' },
      { word: 'meh', language: 'nb' },
    ]);
  });
});

describe('mapLanguageKeyToLanguageText', () => {
  it('to return Bokmål for nb', () => {
    const translationFunctionMock = (key: string) => {
      if (key === 'language.nb') return 'Bokmål';
      if (key === 'language.nn') return 'Nynorsk';
      if (key === 'language.en') return 'Engelsk';
      return key;
    };

    const result = mapLanguageKeyToLanguageText('nb', translationFunctionMock);
    expect(result).toEqual('Bokmål');
  });
});

describe('getMissingInputLanguageString', () => {
  it('to map a language with no empty fields to correct string', () => {
    const translationFunctionMock = (key: string) => {
      return key;
    };

    const languageStringMock: SupportedLanguage = {
      nb: 'Test tekst',
      nn: 'Test',
      en: 'Test',
    };

    const result = getMissingInputLanguageString(
      languageStringMock,
      'test',
      translationFunctionMock,
    );
    expect(result).toEqual('');
  });

  it('to map a language with 1 non-empty field to correct string', () => {
    const translationFunctionMock = (key: string) => {
      if (key === 'resourceadm.about_resource_language_error_missing_1')
        return 'Du mangler oversettelse for test på Engelsk.';
      return key;
    };

    const languageStringMock: SupportedLanguage = {
      nb: 'Test tekst',
      nn: 'Test',
      en: '',
    };
    const missingInputLanguageStringTestMock: string =
      'Du mangler oversettelse for test på Engelsk.';

    const result = getMissingInputLanguageString(
      languageStringMock,
      'test',
      translationFunctionMock,
    );
    expect(result).toEqual(missingInputLanguageStringTestMock);
  });

  it('to map a language with 2 non-empty fields to correct string', () => {
    const translationFunctionMock = (key: string) => {
      if (key === 'resourceadm.about_resource_language_error_missing_2')
        return 'Du mangler oversettelse for test på Nynorsk og Engelsk.';
      return key;
    };

    const languageStringMock: SupportedLanguage = {
      nb: 'Test tekst',
      nn: '',
      en: '',
    };
    const missingInputLanguageStringTestMock: string =
      'Du mangler oversettelse for test på Nynorsk og Engelsk.';

    const result = getMissingInputLanguageString(
      languageStringMock,
      'test',
      translationFunctionMock,
    );
    expect(result).toEqual(missingInputLanguageStringTestMock);
  });
});

describe('deepCompare', () => {
  it('should return true for equal objects', () => {
    const obj1 = {
      array: [
        { a: 1, b: 2 },
        { a: 11, b: 22 },
      ],
      text: 'text',
      subObj: {
        prop: null,
        other: 'other',
      },
    };
    const obj2 = {
      subObj: {
        other: 'other',
        prop: null,
      },
      text: 'text',
      array: [
        { b: 2, a: 1 },
        { b: 22, a: 11 },
      ],
    };
    const areEqual = deepCompare(obj1, obj2);
    expect(areEqual).toBeTruthy();
  });

  it('should return true for null objects', () => {
    const areEqual = deepCompare(null, null);
    expect(areEqual).toBeTruthy();
  });

  it('should return false when one object is null', () => {
    const areEqual = deepCompare(null, {});
    expect(areEqual).toBeFalsy();
  });

  it('should return false when objects are not equal', () => {
    const areEqual = deepCompare({ a: 1 }, {});
    expect(areEqual).toBeFalsy();
  });

  it('should return false when objects are not equal', () => {
    const areEqual = deepCompare({ a: 1 }, {});
    expect(areEqual).toBeFalsy();
  });

  it('should return false when comparing empty object with empty array', () => {
    const areEqual = deepCompare([], {});
    expect(areEqual).toBeFalsy();
  });

  describe('getEnvLabel', () => {
    it('should return label for selected environment when environment exists', () => {
      const envLabel = getEnvLabel('tt02');
      expect(envLabel).toEqual('resourceadm.deploy_test_env');
    });

    it('should return empty label for selected environment when environment with given id does not exist', () => {
      const envLabel = getEnvLabel('mu01' as EnvId);
      expect(envLabel).toEqual('');
    });
  });

  describe('validateResource', () => {
    it('should return all possible errors for maskinportenSchema', () => {
      const resource: Resource = {
        identifier: 'res',
        resourceType: 'MaskinportenSchema',
        title: null,
        description: null,
        delegable: true,
        rightDescription: null,
        resourceReferences: [{ reference: 'hei', referenceSource: 'Default', referenceType: null }],
        status: null,
        availableForType: null,
        contactPoints: [{ category: '', contactPage: '', email: '', telephone: '' }],
      };
      const validationErrors = validateResource(resource, () => 'test');
      expect(validationErrors.length).toBe(13);
    });

    it('should return all possible errors for genericAccessResource', () => {
      const resource: Resource = {
        identifier: 'res',
        resourceType: null,
        title: null,
        description: null,
        delegable: true,
        rightDescription: null,
        status: null,
        availableForType: null,
        contactPoints: null,
      };
      const validationErrors = validateResource(resource, () => 'test');
      expect(validationErrors.length).toBe(13);
    });

    it('should return all possible errors for consentResource', () => {
      const resource: Resource = {
        identifier: 'res',
        resourceType: 'Consentresource',
        title: null,
        description: null,
        delegable: true,
        rightDescription: null,
        status: null,
        availableForType: null,
        contactPoints: [{ category: '', contactPage: '', email: '', telephone: '' }],
      };
      const validationErrors = validateResource(resource, () => 'test');
      expect(validationErrors.length).toBe(16);
    });

    it('should show empty errors for contactPoints and resourceReferences', () => {
      const resource: Resource = {
        identifier: 'res',
        resourceType: 'MaskinportenSchema',
        title: null,
        description: null,
        delegable: true,
        rightDescription: null,
        resourceReferences: [],
        status: null,
        availableForType: null,
        contactPoints: [],
      };
      const validationErrors = validateResource(resource, () => 'test');
      expect(validationErrors.length).toBe(13);
    });
  });
});

describe('getMigrationErrorMessage', () => {
  it('returns no error', () => {
    const error = getMigrationErrorMessage(null, null, true);
    expect(error).toBeNull();
  });

  it('returns error when start migration status is forbidden', () => {
    const migrateError = { response: { status: ServerCodes.Forbidden } };
    const error = getMigrationErrorMessage(null, migrateError as ResourceError, true);
    expect(error.errorMessage).toEqual('resourceadm.migration_no_migration_access');
  });

  it('returns error when start migration failed', () => {
    const migrateError = { response: { status: ServerCodes.InternalServerError } };
    const error = getMigrationErrorMessage(null, migrateError as ResourceError, true);
    expect(error.errorMessage).toEqual('resourceadm.migration_post_migration_failed');
  });

  it('returns error when service is not found', () => {
    const loadDelegationCountError = { response: { status: ServerCodes.NotFound } };
    const error = getMigrationErrorMessage(loadDelegationCountError as ResourceError, null, true);
    expect(error.errorMessage).toEqual('resourceadm.migration_service_not_found');
  });

  it('returns error when service cannot be migrated in environment', () => {
    const loadDelegationCountError = { response: { status: ServerCodes.Forbidden } };
    const error = getMigrationErrorMessage(loadDelegationCountError as ResourceError, null, true);
    expect(error.errorMessage).toEqual('resourceadm.migration_cannot_migrate_in_env');
  });

  it('returns error when unknown error occurs', () => {
    const loadDelegationCountError = { response: { status: ServerCodes.InternalServerError } };
    const error = getMigrationErrorMessage(loadDelegationCountError as ResourceError, null, true);
    expect(error.errorMessage).toEqual('resourceadm.migration_technical_error');
  });

  it('returns error when resource is not published', () => {
    const error = getMigrationErrorMessage(null, null, false);
    expect(error.errorMessage).toEqual('resourceadm.migration_not_published');
  });
});
