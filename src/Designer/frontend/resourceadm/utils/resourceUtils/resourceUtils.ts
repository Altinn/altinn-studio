import type {
  ResourceTypeOption,
  ResourceStatusOption,
  ResourceAvailableForTypeOption,
  ResourceKeyword,
  ValidLanguage,
  SupportedLanguage,
  Resource,
  ResourceFormError,
  ResourceError,
  ConsentMetadata,
  AccessList,
} from 'app-shared/types/ResourceAdm';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import type { Policy, PolicyRule, PolicySubject } from '@altinn/policy-editor/types';
import type { TFunction } from 'i18next';
import {
  emptyPolicyRule,
  organizationSubject,
  policySubjectOrg,
} from '@altinn/policy-editor/utils';
import {
  ACCESS_LIST_SUBJECT_SOURCE,
  CONSENT_ACTION,
  REQUEST_CONSENT_ACTION,
} from '@altinn/policy-editor/constants';

/**
 * The map of resource type
 */
export const resourceTypeMap: Record<ResourceTypeOption, string> = {
  GenericAccessResource: 'resourceadm.about_resource_resource_type_generic_access_resource',
  Systemresource: 'resourceadm.about_resource_resource_type_system_resource',
  MaskinportenSchema: 'resourceadm.about_resource_resource_type_maskinporten',
  BrokerService: 'resourceadm.about_resource_resource_type_brokerservice',
  CorrespondenceService: 'resourceadm.about_resource_resource_type_correspondenceservice',
  Consent: 'resourceadm.about_resource_resource_type_consentresource',
};

/**
 * The map of resource status
 */
export const resourceStatusMap: Record<ResourceStatusOption, string> = {
  Completed: 'resourceadm.about_resource_status_completed',
  Deprecated: 'resourceadm.about_resource_status_deprecated',
  UnderDevelopment: 'resourceadm.about_resource_status_under_development',
  Withdrawn: 'resourceadm.about_resource_status_withdrawn',
};

/**
 * The map of resource status
 */
export const availableForTypeMap: Record<ResourceAvailableForTypeOption, string> = {
  PrivatePerson: 'resourceadm.about_resource_available_for_type_private',
  LegalEntityEnterprise: 'resourceadm.about_resource_available_for_type_legal',
  Company: 'resourceadm.about_resource_available_for_type_company',
  BankruptcyEstate: 'resourceadm.about_resource_available_for_type_bankruptcy',
  SelfRegisteredUser: 'resourceadm.about_resource_available_for_type_self_registered',
};

export type EnvId = 'tt02' | 'prod' | 'yt01' | 'at22' | 'at23' | 'at24';
export type EnvType = 'test' | 'prod';
export type Environment = {
  id: EnvId;
  label: string;
  envType: EnvType;
};

const environments: Record<EnvId, Environment> = {
  ['at22']: {
    id: 'at22' as EnvId,
    label: 'resourceadm.deploy_at22_env',
    envType: 'test' as EnvType,
  },
  ['at23']: {
    id: 'at23' as EnvId,
    label: 'resourceadm.deploy_at23_env',
    envType: 'test' as EnvType,
  },
  ['at24']: {
    id: 'at24' as EnvId,
    label: 'resourceadm.deploy_at24_env',
    envType: 'test' as EnvType,
  },
  ['yt01']: {
    id: 'yt01' as EnvId,
    label: 'resourceadm.deploy_yt01_env',
    envType: 'test' as EnvType,
  },
  ['tt02']: {
    id: 'tt02' as EnvId,
    label: 'resourceadm.deploy_test_env',
    envType: 'test' as EnvType,
  },
  ['prod']: {
    id: 'prod' as EnvId,
    label: 'resourceadm.deploy_prod_env',
    envType: 'prod' as EnvType,
  },
};

export const getAvailableEnvironments = (org: string): Environment[] => {
  const availableEnvs = [environments['tt02'], environments['prod']];
  if (org === 'ttd' || org === 'digdir') {
    availableEnvs.push(
      environments['yt01'],
      environments['at22'],
      environments['at23'],
      environments['at24'],
    );
  }
  if (org === 'skd') {
    availableEnvs.push(environments['yt01']);
  }
  return availableEnvs;
};
export const getEnvLabel = (env: EnvId): string => {
  return environments[env]?.label || '';
};

/**
 * ------------ Temporary functions -------------
 * The first one maps keyword to string, and the second from string to keyword
 *
 * TODO - Find out how to handle it in the future
 */
export const mapKeywordsArrayToString = (resourceKeywords: ResourceKeyword[]): string => {
  return resourceKeywords.map((k) => k.word).join(', ');
};
export const mapKeywordStringToKeywordTypeArray = (keywrodString: string): ResourceKeyword[] => {
  return keywrodString
    .split(',')
    .filter(Boolean)
    .map((val) => ({ language: 'nb', word: val.trim() }));
};

export const getResourceIdentifierErrorMessage = (
  identifier: string,
  org: string,
  isConflict?: boolean,
) => {
  if (isConflict) {
    return 'resourceadm.dashboard_resource_name_and_id_error';
  } else if (!hasOrgPrefixInIdentifier(identifier, org)) {
    return 'resourceadm.dashboard_resource_id_must_start_with_org';
  }
  return '';
};

export const getValidIdentifierPrefixes = (org: string): string[] => {
  if (org === 'skd') {
    return ['skd-', 'skd_', 'ske-', 'ske_'];
  }
  if (org === 'digdir') {
    return ['digdir-', 'digdir_', 'altinn-', 'altinn_'];
  }
  return [`${org}-`, `${org}_`];
};

export const hasOrgPrefixInIdentifier = (identifier: string, org: string): boolean => {
  return getValidIdentifierPrefixes(org).some((prefix) => identifier.startsWith(prefix));
};

/**
 * Deep compare two objects. Will call itself recursively for nested keys
 * @param original the original object
 * @param changed the changed object
 *
 * @returns true if objects are equal, false otherwise
 */
export const deepCompare = (original: any, changed: any) => {
  if (original === changed) {
    return true;
  }

  if (
    typeof original !== 'object' ||
    typeof changed !== 'object' ||
    original === null ||
    changed === null ||
    Array.isArray(original) !== Array.isArray(changed)
  ) {
    return false;
  }

  const originalKeys = Object.keys(original);
  const changedKeys = Object.keys(changed);

  if (originalKeys.length !== changedKeys.length) {
    return false;
  }

  return originalKeys.every(
    (key) => changedKeys.includes(key) && deepCompare(original[key], changed[key]),
  );
};

export const validateResource = (
  resourceData: Resource | undefined,
  t: TFunction<'translation', undefined>,
): ResourceFormError[] => {
  const errors: ResourceFormError[] = [];

  if (!resourceData) {
    return [];
  }
  // validate resourceType
  if (!Object.keys(resourceTypeMap).includes(resourceData.resourceType)) {
    errors.push({
      field: 'resourceType',
      error: t('resourceadm.about_resource_resource_type_error'),
    });
  }

  // validate title
  if (!resourceData.title?.nb) {
    errors.push({
      field: 'title',
      index: 'nb',
      error: t('resourceadm.about_resource_error_translation_missing_title_nb'),
    });
  }
  if (!resourceData.title?.nn) {
    errors.push({
      field: 'title',
      index: 'nn',
      error: t('resourceadm.about_resource_error_translation_missing_title_nn'),
    });
  }
  if (!resourceData.title?.en) {
    errors.push({
      field: 'title',
      index: 'en',
      error: t('resourceadm.about_resource_error_translation_missing_title_en'),
    });
  }

  // validate description
  if (!resourceData.description?.nb) {
    errors.push({
      field: 'description',
      index: 'nb',
      error: t('resourceadm.about_resource_error_translation_missing_description_nb'),
    });
  }
  if (!resourceData.description?.nn) {
    errors.push({
      field: 'description',
      index: 'nn',
      error: t('resourceadm.about_resource_error_translation_missing_description_nn'),
    });
  }
  if (!resourceData.description?.en) {
    errors.push({
      field: 'description',
      index: 'en',
      error: t('resourceadm.about_resource_error_translation_missing_description_en'),
    });
  }

  // validate rightDescription
  if (resourceData.delegable) {
    if (!resourceData.rightDescription?.nb) {
      errors.push({
        field: 'rightDescription',
        index: 'nb',
        error: t('resourceadm.about_resource_error_translation_missing_rights_description_nb'),
      });
    }
    if (!resourceData.rightDescription?.nn) {
      errors.push({
        field: 'rightDescription',
        index: 'nn',
        error: t('resourceadm.about_resource_error_translation_missing_rights_description_nn'),
      });
    }
    if (!resourceData.rightDescription?.en) {
      errors.push({
        field: 'rightDescription',
        index: 'en',
        error: t('resourceadm.about_resource_error_translation_missing_rights_description_en'),
      });
    }
  }

  // validate status
  if (!Object.keys(resourceStatusMap).includes(resourceData.status)) {
    errors.push({
      field: 'status',
      error: t('resourceadm.about_resource_status_error'),
    });
  }

  // validate availableForType
  if (
    resourceData.resourceType !== 'MaskinportenSchema' &&
    !resourceData.availableForType?.length
  ) {
    errors.push({
      field: 'availableForType',
      error: t('resourceadm.about_resource_available_for_error_message'),
    });
  }

  // validate resourceReferences
  if (resourceData.resourceType === 'MaskinportenSchema') {
    // if there are no references, an empty reference is added in the reference component
    if (!resourceData.resourceReferences?.length) {
      errors.push({
        field: `resourceReferences`,
        index: 0,
        error: t('resourceadm.about_resource_reference_error'),
      });
    }

    resourceData.resourceReferences?.map((x, index) => {
      if (!x.reference || !x.referenceSource || !x.referenceType) {
        errors.push({
          field: 'resourceReferences',
          index: index,
          error: t('resourceadm.about_resource_reference_error'),
        });
      }
    });
    const hasMaskinportenScope = resourceData.resourceReferences?.some(
      (ref) => ref.referenceType === 'MaskinportenScope',
    );
    if (!hasMaskinportenScope) {
      errors.push({
        field: 'resourceReferences',
        error: t('resourceadm.about_resource_reference_maskinporten_missing'),
      });
    }
  }

  // validate consentTemplate
  if (resourceData.resourceType === 'Consent') {
    if (!resourceData.consentTemplate) {
      errors.push({
        field: 'consentTemplate',
        error: t('resourceadm.about_resource_consent_template_missing'),
      });
    }

    if (!resourceData.consentText?.nb) {
      errors.push({
        field: 'consentText',
        index: 'nb',
        error: t('resourceadm.about_resource_error_translation_missing_consent_text_nb'),
      });
    }
    if (!resourceData.consentText?.nn) {
      errors.push({
        field: 'consentText',
        index: 'nn',
        error: t('resourceadm.about_resource_error_translation_missing_consent_text_nn'),
      });
    }
    if (!resourceData.consentText?.en) {
      errors.push({
        field: 'consentText',
        index: 'en',
        error: t('resourceadm.about_resource_error_translation_missing_consent_text_en'),
      });
    }

    // validate consentMetadata values used in consentText
    const unknowMetadataValues = getUnknownMetadataValues(
      resourceData.consentMetadata,
      resourceData.consentText,
    );

    Object.keys(unknowMetadataValues).forEach((language: ValidLanguage) => {
      if (unknowMetadataValues[language].length) {
        errors.push({
          field: 'consentText',
          index: language,
          error: t('resourceadm.about_resource_error_unknown_metadata_language', {
            unknownMetadataValues: unknowMetadataValues[language].join(', '),
            lang1: t(`language.${language}`),
          }),
        });
      }
    });

    // validate links used in consentText
    (['nb', 'nn', 'en'] as const).forEach((language: ValidLanguage) => {
      const text = resourceData.consentText?.[language] ?? '';
      const links: string[] = (text.match(/\[[^\]]+\]\([^)]+\)/g) ?? []) as string[];
      links.forEach((link) => {
        const urlMatch = link.match(/\[[^\]]+\]\(([^)]+)\)/);
        const linkUrl = urlMatch?.[1];
        const isLinkUrlValid =
          !!linkUrl && (/^https?:\/\//.test(linkUrl) || /^{[a-z]+}/.test(linkUrl));
        if (!isLinkUrlValid) {
          errors.push({
            field: 'consentText',
            index: language,
            error: t('resourceadm.about_resource_error_consent_text_link_invalid', {
              link,
              interpolation: { escapeValue: false },
            }),
          });
        }
      });
    });
  }

  // validate contactPoints
  // if there are no contactPoints, an empty contactPoint is added in the contactPoints component
  if (!resourceData.contactPoints?.length) {
    errors.push({
      field: `contactPoints`,
      index: 0,
      error: t('resourceadm.about_resource_contact_point_error'),
    });
  }
  resourceData.contactPoints?.map((x, index) => {
    if (!x.category && !x.email && !x.telephone && !x.contactPage) {
      errors.push({
        field: 'contactPoints',
        index: index,
        error: t('resourceadm.about_resource_contact_point_error'),
      });
    }
  });

  return errors;
};

export const getAltinn2Reference = (
  resource: Resource,
): [serviceCode: string, serviceEdition: string] | null => {
  const serviceCode = resource?.resourceReferences?.find(
    (ref) => ref.referenceSource === 'Altinn2' && ref.referenceType === 'ServiceCode',
  )?.reference;
  const serviceEdition = resource?.resourceReferences?.find(
    (ref) => ref.referenceSource === 'Altinn2' && ref.referenceType === 'ServiceEditionCode',
  )?.reference;
  return serviceCode && serviceEdition ? [serviceCode, serviceEdition] : null;
};

export const getMigrationErrorMessage = (
  loadDelegationCountError: Error | null,
  migrateDelegationsError: Error | null,
  isPublishedInEnv: boolean,
): {
  errorMessage: string;
  severity: 'success' | 'warning' | 'danger';
} | null => {
  const loadErrorStatus = (loadDelegationCountError as ResourceError)?.response.status;
  const isErrorForbidden =
    (migrateDelegationsError as ResourceError)?.response?.status === ServerCodes.Forbidden;

  if (migrateDelegationsError) {
    return {
      errorMessage: isErrorForbidden
        ? 'resourceadm.migration_no_migration_access'
        : 'resourceadm.migration_post_migration_failed',
      severity: 'danger',
    };
  } else if (loadErrorStatus === ServerCodes.NotFound) {
    return {
      errorMessage: 'resourceadm.migration_service_not_found',
      severity: 'success',
    };
  } else if (loadErrorStatus === ServerCodes.Forbidden) {
    return {
      errorMessage: 'resourceadm.migration_cannot_migrate_in_env',
      severity: 'danger',
    };
  } else if (loadErrorStatus === ServerCodes.InternalServerError) {
    return {
      errorMessage: 'resourceadm.migration_technical_error',
      severity: 'danger',
    };
  } else if (!isPublishedInEnv) {
    return {
      errorMessage: 'resourceadm.migration_not_published',
      severity: 'warning',
    };
  }
  return null;
};

export const convertMetadataStringToConsentMetadata = (metadataString: string): ConsentMetadata => {
  return metadataString.split(',').reduce((acc: ConsentMetadata, key: string) => {
    const trimmedKey = key.trim();
    if (trimmedKey.length) {
      acc[trimmedKey] = { optional: false };
    }
    return acc;
  }, {});
};

const getConsentMetadataValuesFromText = (text: string | null | undefined): string[] => {
  return text?.match(/{([^{}]*?)}/g) ?? [];
};
const getUnknownMetadataValuesInText = (
  metadataValues: ConsentMetadata | null | undefined,
  consentText: string | null | undefined,
) => {
  const metadataKeysInConsentText = getConsentMetadataValuesFromText(consentText);
  const unknownMetadataValueUsed = metadataKeysInConsentText
    .map((metadataKey) => metadataKey.slice(1, -1))
    .filter((metadataKey) => !metadataValues?.[metadataKey]);

  return unknownMetadataValueUsed;
};
const getUnknownMetadataValues = (
  metadataValues: ConsentMetadata | null | undefined,
  consentTexts: SupportedLanguage | null | undefined,
) => {
  return {
    nb: getUnknownMetadataValuesInText(metadataValues, consentTexts?.nb),
    nn: getUnknownMetadataValuesInText(metadataValues, consentTexts?.nn),
    en: getUnknownMetadataValuesInText(metadataValues, consentTexts?.en),
  };
};

const getConsentResourceDefaultRules = (resourceId: string): PolicyRule[] => {
  const requestConsentRule = {
    ...emptyPolicyRule,
    subject: [organizationSubject.urn],
    actions: [REQUEST_CONSENT_ACTION],
    ruleId: '1',
    resources: [[`urn:altinn:resource:${resourceId}`]],
  };
  const acceptConsentRule = {
    ...emptyPolicyRule,
    actions: [CONSENT_ACTION],
    ruleId: '2',
    resources: [[`urn:altinn:resource:${resourceId}`]],
  };

  return [requestConsentRule, acceptConsentRule];
};

const hasPolicyAction = (rule: PolicyRule, targetAction: string): boolean => {
  return rule.actions.some((action) => action === targetAction);
};
const hasConsentRules = (policyData: Policy): boolean => {
  const hasAcceptConsentAction = policyData.rules.some((rule) =>
    hasPolicyAction(rule, CONSENT_ACTION),
  );
  const hasRequestConsentAction = policyData.rules.some((rule) =>
    hasPolicyAction(rule, REQUEST_CONSENT_ACTION),
  );

  return hasAcceptConsentAction && hasRequestConsentAction;
};

export const getResourcePolicyRules = (
  policyData: Policy,
  resourceId: string,
  isConsentResource: boolean,
) => {
  if (isConsentResource && !hasConsentRules(policyData)) {
    return {
      ...policyData,
      rules: getConsentResourceDefaultRules(resourceId),
    };
  } else if (!isConsentResource && hasConsentRules(policyData)) {
    // remove consent only-rules if resource has consent rules but is not a consent resource
    return {
      ...policyData,
      rules: policyData.rules.filter(
        (rule) =>
          !hasPolicyAction(rule, CONSENT_ACTION) && !hasPolicyAction(rule, REQUEST_CONSENT_ACTION),
      ),
    };
  }
  return policyData;
};

export const createAccessListSubject = (accessList: AccessList, org: string): PolicySubject => {
  const urn = `${ACCESS_LIST_SUBJECT_SOURCE}:${org}:${accessList.identifier}`;
  return {
    id: accessList.identifier,
    description: accessList.description,
    legacyUrn: urn,
    urn: urn,
    name: accessList.name,
    legacyRoleCode: accessList.identifier,
    provider: {
      id: '',
      code: 'sys-accesslist',
      name: '',
    },
  };
};

export const getResourceSubjects = (
  accessLists: AccessList[],
  subjectData: PolicySubject[],
  org: string,
  resourceType: ResourceTypeOption,
) => {
  if (resourceType === 'Consent') {
    const accessListSubjects: PolicySubject[] = (accessLists ?? []).map((accessList) => {
      return createAccessListSubject(accessList, org);
    });
    return [...subjectData, ...accessListSubjects, organizationSubject];
  }
  if (resourceType === 'CorrespondenceService') {
    return [...subjectData, policySubjectOrg];
  }
  return subjectData;
};
