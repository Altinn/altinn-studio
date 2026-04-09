import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';

export type FieldConfig = {
  anchor: string;
  translationKey: string;
  critical: boolean;
};

export type ErrorItem = {
  errorKey: string;
  search: string;
  fullHref: string;
  errorMessage: string;
};

export const mapErrorKeyErrorItems = (
  errorKeys: string[],
  severity: 'warning' | 'danger',
  org: string,
  app: string,
  t: (key: string) => string,
): ErrorItem[] => {
  return errorKeys
    .filter((errorKey) => {
      const fieldConfig = getFieldConfig(errorKey);
      if (!fieldConfig) {
        // If there's no specific field config, we treat it as a critical error for 'danger'
        return severity === 'danger';
      }
      return fieldConfig.critical === (severity === 'danger');
    })
    .map((errorKey) => {
      const fieldConfig = getFieldConfig(errorKey);
      const anchor = fieldConfig?.anchor ?? '';
      const search = `currentTab=about&focus=${anchor}`;
      const fullHref = `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/app-settings?${search}`;
      const errorMessage = t(fieldConfig?.translationKey ?? errorKey);
      return { errorKey, search, fullHref, errorMessage };
    });
};

export const appHasCriticalValidationErrors = (errorKeys: string[]): boolean => {
  return errorKeys.some((errorKey) => getFieldConfig(errorKey)?.critical ?? true);
};

export const VALIDATION_FIELD_CONFIG: Record<string, FieldConfig> = {
  identifier: {
    anchor: 'identifier',
    translationKey: 'app_validation.app_metadata.identifier.required',
    critical: true,
  },
  title: {
    anchor: 'title-nb',
    translationKey: 'app_validation.app_metadata.title.required',
    critical: true,
  },
  'title.nb': {
    anchor: 'title-nb',
    translationKey: 'app_validation.app_metadata.title.nb.required',
    critical: true,
  },
  'title.nn': {
    anchor: 'title-nn',
    translationKey: 'app_validation.app_metadata.title.nn.required',
    critical: true,
  },
  'title.en': {
    anchor: 'title-en',
    translationKey: 'app_validation.app_metadata.title.en.required',
    critical: false,
  },
  description: {
    anchor: 'description-nb',
    translationKey: 'app_validation.app_metadata.description.required',
    critical: true,
  },
  'description.nb': {
    anchor: 'description-nb',
    translationKey: 'app_validation.app_metadata.description.nb.required',
    critical: true,
  },
  'description.nn': {
    anchor: 'description-nn',
    translationKey: 'app_validation.app_metadata.description.nn.required',
    critical: true,
  },
  'description.en': {
    anchor: 'description-en',
    translationKey: 'app_validation.app_metadata.description.en.required',
    critical: false,
  },
  'access.rightDescription': {
    anchor: 'rightDescription-nb',
    translationKey: 'app_validation.app_metadata.right_description.required',
    critical: true,
  },
  'access.rightDescription.nb': {
    anchor: 'rightDescription-nb',
    translationKey: 'app_validation.app_metadata.right_description.nb.required',
    critical: true,
  },
  'access.rightDescription.nn': {
    anchor: 'rightDescription-nn',
    translationKey: 'app_validation.app_metadata.right_description.nn.required',
    critical: true,
  },
  'access.rightDescription.en': {
    anchor: 'rightDescription-en',
    translationKey: 'app_validation.app_metadata.right_description.en.required',
    critical: false,
  },
  contactPoints: {
    anchor: 'contactPoints-0',
    translationKey: 'app_validation.app_metadata.contact_points.required',
    critical: true,
  },
  'access.delegable': {
    anchor: 'access-delegable',
    translationKey: 'app_validation.app_metadata.delegable.required',
    critical: true,
  },
  'access.visible': {
    anchor: 'visible',
    translationKey: 'app_validation.app_metadata.visible.required',
    critical: true,
  },
};

export const getFieldConfig = (errorKey: string): FieldConfig | undefined => {
  if (VALIDATION_FIELD_CONFIG[errorKey]) {
    return VALIDATION_FIELD_CONFIG[errorKey];
  }

  const contactPointMatch = errorKey.match(/^contactPoints\[(\d+)\]$/);
  if (contactPointMatch) {
    const index = contactPointMatch[1];
    return {
      anchor: `contactPoints-${index}`,
      translationKey: 'app_validation.app_metadata.contact_points.incomplete',
      critical: true,
    };
  }

  return undefined;
};
