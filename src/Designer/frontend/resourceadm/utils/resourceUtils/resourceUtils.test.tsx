import {
  deepCompare,
  getEnvLabel,
  mapKeywordStringToKeywordTypeArray,
  validateResource,
  getMigrationErrorMessage,
  getAvailableEnvironments,
  getResourcePolicyRules,
  getResourceSubjects,
} from './';
import { createAccessListSubject, type EnvId } from './resourceUtils';
import type { Resource, ResourceError, ResourceFormError } from 'app-shared/types/ResourceAdm';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { textMock } from '@studio/testing/mocks/i18nMock';
import {
  emptyPolicyRule,
  organizationSubject,
  policySubjectOrg,
} from '@altinn/policy-editor/utils';
import type { Policy, PolicyRule } from '@altinn/policy-editor/types';
import { CONSENT_ACTION, REQUEST_CONSENT_ACTION } from '@altinn/policy-editor/constants';

const policySubject = [
  {
    id: '16857e39-441f-4dd4-8592-aed94e816c04',
    name: 'Begrenset signeringsrettighet',
    description:
      'Tilgang til å signere utvalgte skjema og tjenester. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.',
    urn: 'urn:altinn:rolecode:SISKD',
    legacyRoleCode: 'SISKD',
    legacyUrn: 'urn:altinn:rolecode:SISKD',
    provider: {
      id: '0195ea92-2080-777d-8626-69c91ea2a05d',
      name: 'Altinn 2',
      code: 'sys-altinn2',
    },
  },
];

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
      const validationErrors = validateResource(resource, textMock);
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
      const validationErrors = validateResource(resource, textMock);
      expect(validationErrors.length).toBe(13);
    });

    it('should return all possible errors for consent resource', () => {
      const resource: Resource = {
        identifier: 'res',
        resourceType: 'Consent',
        title: null,
        description: null,
        delegable: true,
        rightDescription: null,
        status: null,
        availableForType: null,
        contactPoints: [{ category: '', contactPage: '', email: '', telephone: '' }],
      };
      const validationErrors = validateResource(resource, textMock);
      expect(validationErrors.length).toBe(16);
    });

    describe('should return error for consentText field', () => {
      const hasConsentFieldError = (
        errors: ResourceFormError[],
        index: string,
        expectedErrorText: string,
      ) => {
        return errors.some((validationError) => {
          return (
            validationError.field === 'consentText' &&
            validationError.index === index &&
            validationError.error === expectedErrorText
          );
        });
      };

      it('should return error for nb consentText field', () => {
        const resource: Resource = {
          identifier: 'res',
          resourceType: 'Consent',
          title: null,
          consentMetadata: {
            org: { optional: false },
          },
          consentText: {
            nb: 'test {year}',
            nn: 'test',
            en: 'test',
          },
          contactPoints: [{ category: '', contactPage: '', email: '', telephone: '' }],
        };
        const validationErrors = validateResource(resource, textMock);

        expect(
          hasConsentFieldError(
            validationErrors,
            'nb',
            textMock('resourceadm.about_resource_error_unknown_metadata_language', {
              unknownMetadataValues: 'year',
              lang1: textMock('language.nb'),
            }),
          ),
        ).toBeTruthy();
      });

      it('should return error for nn consentText field', () => {
        const resource: Resource = {
          identifier: 'res',
          resourceType: 'Consent',
          title: null,
          consentMetadata: {
            org: { optional: false },
          },
          consentText: {
            nb: 'test',
            nn: 'test {year}',
            en: 'test',
          },
          contactPoints: [{ category: '', contactPage: '', email: '', telephone: '' }],
        };
        const validationErrors = validateResource(resource, textMock);

        expect(
          hasConsentFieldError(
            validationErrors,
            'nn',
            textMock('resourceadm.about_resource_error_unknown_metadata_language', {
              unknownMetadataValues: 'year',
              lang1: textMock('language.nn'),
            }),
          ),
        ).toBeTruthy();
      });

      it('should return errors for nn and en consentText field', () => {
        const resource: Resource = {
          identifier: 'res',
          resourceType: 'Consent',
          title: null,
          consentMetadata: {
            org: { optional: false },
          },
          consentText: {
            nb: 'test',
            nn: 'test {year}',
            en: 'test {year}',
          },
          contactPoints: [{ category: '', contactPage: '', email: '', telephone: '' }],
        };
        const validationErrors = validateResource(resource, textMock);
        expect(
          hasConsentFieldError(
            validationErrors,
            'nn',
            textMock('resourceadm.about_resource_error_unknown_metadata_language', {
              unknownMetadataValues: 'year',
              lang1: textMock('language.nn'),
            }),
          ),
        ).toBeTruthy();
        expect(
          hasConsentFieldError(
            validationErrors,
            'en',
            textMock('resourceadm.about_resource_error_unknown_metadata_language', {
              unknownMetadataValues: 'year',
              lang1: textMock('language.en'),
            }),
          ),
        ).toBeTruthy();
      });

      it('should return error for invalid links in nb consentText field', () => {
        const invalidLink = '[Link](htttps://altinn.no)';
        const resource: Resource = {
          identifier: 'res',
          resourceType: 'Consent',
          title: null,
          consentMetadata: {},
          consentText: {
            nb: `test ${invalidLink}`,
            nn: 'test',
            en: 'test',
          },
        };
        const validationErrors = validateResource(resource, textMock);

        expect(
          hasConsentFieldError(
            validationErrors,
            'nb',
            textMock('resourceadm.about_resource_error_consent_text_link_invalid', {
              link: invalidLink,
              interpolation: { escapeValue: false },
            }),
          ),
        ).toBeTruthy();
      });

      it('should allow links in nb consentText field which starts with a metadata value', () => {
        const validLink = '[Link]({metadata})';
        const resource: Resource = {
          identifier: 'res',
          resourceType: 'Consent',
          title: null,
          consentMetadata: {
            metadata: { optional: false },
          },
          consentText: {
            nb: `test ${validLink}`,
            nn: 'test',
            en: 'test',
          },
        };
        const validationErrors = validateResource(resource, textMock);

        expect(
          hasConsentFieldError(
            validationErrors,
            'nb',
            textMock('resourceadm.about_resource_error_consent_text_link_invalid', {
              link: validLink,
              interpolation: { escapeValue: false },
            }),
          ),
        ).toBeFalsy();
      });
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
      const validationErrors = validateResource(resource, textMock);
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

describe('getAvailableEnvironments', () => {
  it('returns default environment list for org nav', () => {
    const environments = getAvailableEnvironments('nav');
    expect(environments.map(({ id }) => id)).toEqual(['tt02', 'prod']);
  });

  it('returns all environments for org ttd', () => {
    const environments = getAvailableEnvironments('ttd');
    expect(environments.map(({ id }) => id)).toEqual([
      'tt02',
      'prod',
      'yt01',
      'at22',
      'at23',
      'at24',
    ]);
  });

  it('returns all environments for org digdir', () => {
    const environments = getAvailableEnvironments('digdir');
    expect(environments.map(({ id }) => id)).toEqual([
      'tt02',
      'prod',
      'yt01',
      'at22',
      'at23',
      'at24',
    ]);
  });

  it('returns default environment list + yt01 for org skd', () => {
    const environments = getAvailableEnvironments('skd');
    expect(environments.map(({ id }) => id)).toEqual(['tt02', 'prod', 'yt01']);
  });
});

describe('getResourcePolicyRules', () => {
  const resourceId = 'test-resource-id';

  const createPolicy = (rules: PolicyRule[]): Policy => ({
    rules,
    requiredAuthenticationLevelEndUser: '0',
    requiredAuthenticationLevelOrg: '',
  });

  const expectedConsentRules: PolicyRule[] = [
    {
      ...emptyPolicyRule,
      subject: [organizationSubject.urn],
      actions: [REQUEST_CONSENT_ACTION],
      ruleId: '1',
      resources: [[`urn:altinn:resource:${resourceId}`]],
    },
    {
      ...emptyPolicyRule,
      actions: [CONSENT_ACTION],
      ruleId: '2',
      resources: [[`urn:altinn:resource:${resourceId}`]],
    },
  ];

  it('should add default consent rules if resource is a consent resource and no consent rules exist', () => {
    const policyData = createPolicy([]);
    const result = getResourcePolicyRules(policyData, resourceId, true);

    expect(result.rules).toEqual(expectedConsentRules);
  });

  it('should remove consent rules if resource is not a consent resource but has consent rules', () => {
    const normalRule = {
      ...emptyPolicyRule,
      subject: [],
      actions: [],
      ruleId: '3',
      resources: [[`urn:altinn:resource:${resourceId}`]],
    };
    const policyData = createPolicy([...expectedConsentRules, normalRule]);
    const result = getResourcePolicyRules(policyData, resourceId, false);

    expect(result.rules).toEqual([normalRule]);
  });

  it('should return the same policy if resource is a consent resource and consent rules already exist', () => {
    const policyData = createPolicy(expectedConsentRules);
    const result = getResourcePolicyRules(policyData, resourceId, true);

    expect(result.rules).toEqual(expectedConsentRules);
  });

  it('should return the same policy if resource is not a consent resource and no consent rules exist', () => {
    const policyData = createPolicy([]);
    const result = getResourcePolicyRules(policyData, resourceId, false);

    expect(result.rules).toEqual([]);
  });
});

describe('getResourceSubjects', () => {
  it('should return subjectData if resource is not consent resource', () => {
    const result = getResourceSubjects(undefined, policySubject, 'ttd', 'GenericAccessResource');
    expect(result).toEqual(policySubject);
  });

  it('should return subjectData with accesslists and organization subject if resource is consent resource', () => {
    const accessList = {
      env: 'tt02',
      identifier: 'test-liste',
      name: 'Testliste',
    };

    const accessLists = [accessList];
    const result = getResourceSubjects(accessLists, policySubject, 'ttd', 'Consent');
    expect(result).toEqual([
      ...policySubject,
      createAccessListSubject(accessList, 'ttd'),
      organizationSubject,
    ]);
  });

  it('should return subjectData with organization subject if resource is consent resource', () => {
    const result = getResourceSubjects(undefined, [], 'ttd', 'Consent');
    expect(result).toEqual([organizationSubject]);
  });

  it('should return subjectData with policySubjectOrg subject if resource is CorrespondenceService resource', () => {
    const result = getResourceSubjects(undefined, [], 'ttd', 'CorrespondenceService');
    expect(result).toEqual([policySubjectOrg]);
  });
});
