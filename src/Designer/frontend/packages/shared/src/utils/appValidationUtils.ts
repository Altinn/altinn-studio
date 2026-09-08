import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';

export type AppValidationArea = 'settings' | 'design' | 'data_model' | 'text' | 'process' | 'other';

export type Severity = 'warning' | 'danger';

export type SeverityTextKeys = { label: string; count: string; alertTitle: string };

export type FieldConfig = {
  anchor: string;
  translationKey: string;
  critical: boolean;
  area: AppValidationArea;
};

export type ErrorItem = {
  errorKey: string;
  search: string;
  fullHref: string;
  errorMessage: string;
  area: AppValidationArea;
};

export type AppValidationSummary = {
  errorItems: ErrorItem[];
  warningItems: ErrorItem[];
  areaGroups: AppValidationAreaGroup[];
};

export type AppValidationAreaGroup = {
  area: AppValidationArea;
  areaNameKey: string;
  errorItems: ErrorItem[];
  warningItems: ErrorItem[];
};

const AREA_NAME_KEYS: Record<AppValidationArea, string> = {
  settings: 'app_settings.heading',
  design: 'top_menu.create',
  data_model: 'top_menu.data_model',
  text: 'top_menu.texts',
  process: 'top_menu.process_editor',
  other: 'app_validation.area_other',
};

const APP_VALIDATION_AREAS = Object.keys(AREA_NAME_KEYS) as AppValidationArea[];

export const SEVERITY_TEXT_KEYS: Record<Severity, SeverityTextKeys> = {
  danger: {
    label: 'app_validation.errors_tag',
    count: 'app_validation.error_count',
    alertTitle: 'app_validation.errors_lead',
  },
  warning: {
    label: 'app_validation.warnings_tag',
    count: 'app_validation.warning_count',
    alertTitle: 'app_validation.warnings_lead',
  },
};

export const getAppValidationSummary = (
  errorKeys: string[],
  org: string,
  app: string,
  t: (key: string) => string,
): AppValidationSummary => {
  const errorItems = mapErrorKeyErrorItems(errorKeys, 'danger', org, app, t);
  const warningItems = mapErrorKeyErrorItems(errorKeys, 'warning', org, app, t);
  return {
    errorItems,
    warningItems,
    areaGroups: groupValidationItemsByArea(errorItems, warningItems),
  };
};

export const groupValidationItemsByArea = (
  errorItems: ErrorItem[],
  warningItems: ErrorItem[],
): AppValidationAreaGroup[] =>
  APP_VALIDATION_AREAS.map((area) => ({
    area,
    areaNameKey: AREA_NAME_KEYS[area],
    errorItems: errorItems.filter((errorItem) => errorItem.area === area),
    warningItems: warningItems.filter((warningItem) => warningItem.area === area),
  })).filter((group) => group.errorItems.length > 0 || group.warningItems.length > 0);

export const mapErrorKeyErrorItems = (
  errorKeys: string[],
  severity: Severity,
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
      const area = fieldConfig?.area ?? 'other';
      return { errorKey, search, fullHref, errorMessage, area };
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
    area: 'settings',
  },
  title: {
    anchor: 'title-nb',
    translationKey: 'app_validation.app_metadata.title.required',
    critical: true,
    area: 'settings',
  },
  'title.nb': {
    anchor: 'title-nb',
    translationKey: 'app_validation.app_metadata.title.nb.required',
    critical: true,
    area: 'settings',
  },
  'title.nn': {
    anchor: 'title-nn',
    translationKey: 'app_validation.app_metadata.title.nn.required',
    critical: true,
    area: 'settings',
  },
  'title.en': {
    anchor: 'title-en',
    translationKey: 'app_validation.app_metadata.title.en.required',
    critical: false,
    area: 'settings',
  },
  description: {
    anchor: 'description-nb',
    translationKey: 'app_validation.app_metadata.description.required',
    critical: true,
    area: 'settings',
  },
  'description.nb': {
    anchor: 'description-nb',
    translationKey: 'app_validation.app_metadata.description.nb.required',
    critical: true,
    area: 'settings',
  },
  'description.nn': {
    anchor: 'description-nn',
    translationKey: 'app_validation.app_metadata.description.nn.required',
    critical: true,
    area: 'settings',
  },
  'description.en': {
    anchor: 'description-en',
    translationKey: 'app_validation.app_metadata.description.en.required',
    critical: false,
    area: 'settings',
  },
  'access.rightDescription': {
    anchor: 'rightDescription-nb',
    translationKey: 'app_validation.app_metadata.right_description.required',
    critical: true,
    area: 'settings',
  },
  'access.rightDescription.nb': {
    anchor: 'rightDescription-nb',
    translationKey: 'app_validation.app_metadata.right_description.nb.required',
    critical: true,
    area: 'settings',
  },
  'access.rightDescription.nn': {
    anchor: 'rightDescription-nn',
    translationKey: 'app_validation.app_metadata.right_description.nn.required',
    critical: true,
    area: 'settings',
  },
  'access.rightDescription.en': {
    anchor: 'rightDescription-en',
    translationKey: 'app_validation.app_metadata.right_description.en.required',
    critical: false,
    area: 'settings',
  },
  contactPoints: {
    anchor: 'contactPoints-0',
    translationKey: 'app_validation.app_metadata.contact_points.required',
    critical: true,
    area: 'settings',
  },
  'access.delegable': {
    anchor: 'access-delegable',
    translationKey: 'app_validation.app_metadata.delegable.required',
    critical: true,
    area: 'settings',
  },
  'access.visible': {
    anchor: 'visible',
    translationKey: 'app_validation.app_metadata.visible.required',
    critical: true,
    area: 'settings',
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
      area: 'settings',
    };
  }

  return undefined;
};
