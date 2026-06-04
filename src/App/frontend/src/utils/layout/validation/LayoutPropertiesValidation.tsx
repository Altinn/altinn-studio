import { useEffect } from 'react';

import { useTaskOverrides } from 'src/core/contexts/TaskOverrides';
import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { formatLayoutSchemaValidationError } from 'src/features/devtools/utils/layoutSchemaValidation';
import { FormStore } from 'src/features/form/FormContext';
import { getDefaultDataTypeFromUiFolder } from 'src/features/form/ui';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useProcessQuery, useTaskTypeFromBackend } from 'src/features/instance/useProcessQuery';
import { useLanguage } from 'src/features/language/useLanguage';
import { getFeature } from 'src/features/toggles';
import { useNavigationParam } from 'src/hooks/navigation';
import { getComponentDef, implementsDataModelBindingValidation } from 'src/layout';
import { ProcessTaskType } from 'src/types';
import {
  shouldValidateLayoutConfiguration,
  useLayoutSchemaValidator,
} from 'src/utils/layout/validation/LayoutValidationContext';
import { duplicateStringFilter } from 'src/utils/stringHelper';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { FormBootstrapContextValue } from 'src/features/formBootstrap/types';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompExternal } from 'src/layout/layout';
import type { LayoutValidationResult, ValidateFunc } from 'src/utils/layout/validation/LayoutValidationContext';

type LayoutPropertiesValidationContext = {
  bootstrap: FormBootstrapContextValue;
  schemaValidator: ValidateFunc | undefined;
  langAsString: IUseLanguage['langAsString'];
  hasInstance: boolean;
  application: ApplicationMetadata;
  signingTaskMismatch: boolean;
};

type DataModelBindingsValidator = (
  baseComponentId: string,
  bindings: CompExternal['dataModelBindings'],
  context: ReturnType<typeof makeDataModelBindingValidationContext>,
) => string[];

export function LayoutPropertiesValidation() {
  const enabled = shouldValidateLayoutConfiguration();
  const schemaValidator = useLayoutSchemaValidator(enabled);
  const replaceErrors = FormStore.raw.useStaticSelector((state) => state.layoutDiagnostics.replaceErrors);
  const bootstrap = FormStore.raw.useMemoSelector((state) => state.bootstrap);
  const application = getApplicationMetadata();
  const { langAsString } = useLanguage();
  const hasInstance = useLaxInstanceId() !== undefined;
  const signingTaskMismatch = useSigningTaskMismatch();

  useEffect(() => {
    if (!enabled) {
      replaceErrors({});
      return;
    }

    replaceErrors(
      validateLayoutProperties({
        bootstrap,
        schemaValidator,
        langAsString,
        hasInstance,
        application,
        signingTaskMismatch,
      }),
    );
  }, [application, bootstrap, enabled, hasInstance, langAsString, replaceErrors, schemaValidator, signingTaskMismatch]);

  return null;
}

export function validateLayoutProperties({
  bootstrap,
  schemaValidator,
  langAsString,
  hasInstance,
  application,
  signingTaskMismatch,
}: LayoutPropertiesValidationContext): LayoutValidationResult {
  const errors: LayoutValidationResult = {};
  const context = makeDataModelBindingValidationContext(bootstrap);

  for (const component of Object.values(bootstrap.layoutLookups.allComponents)) {
    if (!component) {
      continue;
    }

    const def = getComponentDef(component.type);
    if (implementsDataModelBindingValidation(def, component) && window.forceNodePropertiesValidation !== 'off') {
      const validateDataModelBindings = def.validateDataModelBindings as DataModelBindingsValidator;
      for (const error of validateDataModelBindings(component.id, component.dataModelBindings, context)) {
        addNodeError(errors, component.id, error, `Data model binding errors for component '/${component.id}'`);
      }
    }

    for (const error of validateComponentLayout(component, {
      bootstrap,
      langAsString,
      hasInstance,
      application,
      signingTaskMismatch,
    })) {
      addNodeError(errors, component.id, error, `Validation error for '${component.id}'`);
    }

    if (schemaValidator) {
      const schemaErrors = def.validateLayoutConfig(component as never, schemaValidator);
      if (schemaErrors) {
        for (const error of schemaErrors
          .map(formatLayoutSchemaValidationError)
          .filter((message) => message != null)
          .filter(duplicateStringFilter) as string[]) {
          addNodeError(errors, component.id, error, `Layout configuration errors for component '/${component.id}'`);
        }
      }
    }
  }

  return errors;
}

function validateComponentLayout(
  component: CompExternal,
  {
    bootstrap,
    langAsString,
    hasInstance,
    application,
    signingTaskMismatch,
  }: Pick<
    LayoutPropertiesValidationContext,
    'bootstrap' | 'langAsString' | 'hasInstance' | 'application' | 'signingTaskMismatch'
  >,
): string[] {
  switch (component.type) {
    case 'AddToList':
      return getFeature('addToListEnabled').value
        ? []
        : [
            `You need to enable the feature flag addToListEnabled to use this component. Please note that the component is experimental
    and the configuration is likely to change.`,
          ];
    case 'Checkboxes':
    case 'List':
    case 'MultipleSelect':
      return validateObjectToGroup(component, langAsString);
    case 'FileUpload':
    case 'FileUploadWithTag':
      return validateFileUploadBindingUniqueness(component, bootstrap, langAsString);
    case 'PDFPreviewButton':
      return hasInstance ? [] : [`Cannot use PDF preview button in a stateless app`];
    case 'SimpleTable':
      return getFeature('simpleTableEnabled').value
        ? []
        : [
            `You need to enable the feature flag simpleTableEnabled to use this component. Please note that the component is experimental

    and the configuration is likely to change.`,
          ];
    case 'SigneeList':
    case 'SigningActions':
    case 'SigningDocumentList':
      return signingTaskMismatch ? [langAsString('signing.wrong_task_error', [component.type])] : [];
    case 'Subform':
      return validateSubform(component, application, langAsString);
    case 'Summary':
      return bootstrap.layoutLookups.allComponents[component.componentRef]
        ? []
        : [`Målet for oppsummeringen (${component.componentRef}) ble ikke funnet`];
    case 'Summary2':
      return validateSummary2(component);
    default:
      return [];
  }
}

function useSigningTaskMismatch(): boolean {
  const currentTaskType = useTaskTypeFromBackend();
  const overriddenTaskId = useTaskOverrides()?.taskId;
  const processTaskId = useProcessQuery().data?.currentTask?.elementId;
  const urlTaskId = useNavigationParam('taskId');
  const isInCurrentTask = (overriddenTaskId ?? urlTaskId) === processTaskId && processTaskId !== undefined;

  return currentTaskType !== ProcessTaskType.Signing && isInCurrentTask;
}

function validateObjectToGroup(
  component: CompExternal<'Checkboxes' | 'List' | 'MultipleSelect'>,
  langAsString: IUseLanguage['langAsString'],
): string[] {
  const group = component.dataModelBindings?.group;
  const deletionStrategy = component.deletionStrategy;
  const checkedBinding = component.dataModelBindings?.checked;

  if (!group) {
    return deletionStrategy || checkedBinding ? [langAsString('config_error.deletion_strategy_no_group')] : [];
  }
  if (!deletionStrategy) {
    return [langAsString('config_error.group_no_deletion_strategy')];
  }
  if (deletionStrategy === 'soft' && !checkedBinding) {
    return [langAsString('config_error.soft_delete_no_checked')];
  }
  if (deletionStrategy === 'hard' && checkedBinding) {
    return [langAsString('config_error.hard_delete_with_checked')];
  }
  return [];
}

function validateFileUploadBindingUniqueness(
  component: CompExternal<'FileUpload' | 'FileUploadWithTag'>,
  bootstrap: FormBootstrapContextValue,
  langAsString: IUseLanguage['langAsString'],
): string[] {
  const binding = extractUploadBinding(component);
  if (!binding) {
    return [];
  }

  const othersWithSameBinding: string[] = [];
  for (const page of Object.values(bootstrap.processedLayouts)) {
    for (const other of page ?? []) {
      if (other.id === component.id || (other.type !== 'FileUpload' && other.type !== 'FileUploadWithTag')) {
        continue;
      }
      const otherBinding = extractUploadBinding(other);
      if (otherBinding && otherBinding.dataType === binding.dataType && otherBinding.field === binding.field) {
        othersWithSameBinding.push(other.id);
      }
    }
  }

  if (othersWithSameBinding.length === 0) {
    return [];
  }

  const othersList = othersWithSameBinding.map((id) => `'${id}'`).join(', ');
  return [langAsString('config_error.file_upload_same_binding', [othersList])];
}

function extractUploadBinding(
  component: CompExternal<'FileUpload' | 'FileUploadWithTag'>,
): IDataModelReference | undefined {
  if (component.dataModelBindings && 'simpleBinding' in component.dataModelBindings) {
    return component.dataModelBindings.simpleBinding;
  }
  if (component.dataModelBindings && 'list' in component.dataModelBindings) {
    return component.dataModelBindings.list;
  }
  return undefined;
}

function validateSubform(
  component: CompExternal<'Subform'>,
  application: ApplicationMetadata,
  langAsString: IUseLanguage['langAsString'],
): string[] {
  const targetType = getDefaultDataTypeFromUiFolder(component.layoutSet);
  const dataType = application.dataTypes.find((x) => x.id.toLocaleLowerCase() === targetType?.toLocaleLowerCase());

  if (targetType === undefined) {
    return [langAsString('config_error.subform_no_datatype_layoutset')];
  }
  if (dataType === undefined) {
    return [langAsString('config_error.subform_no_datatype_appmetadata', [targetType])];
  }
  if (dataType.appLogic?.disallowUserCreate === true && component.showAddButton !== false) {
    return [langAsString('config_error.subform_misconfigured_add_button', [targetType])];
  }
  return [];
}

function validateSummary2(component: CompExternal<'Summary2'>): string[] {
  const errors: string[] = [];
  const overrides = component.overrides;
  if (!overrides) {
    return errors;
  }

  const uniqueComponentIds = new Set<string>();
  const uniqueComponentTypes = new Set<string>();
  for (const override of overrides) {
    if ('componentId' in override) {
      if (uniqueComponentIds.has(override.componentId)) {
        errors.push(`Duplicate componentId '${override.componentId}' in summary overrides`);
      } else {
        uniqueComponentIds.add(override.componentId);
      }
    }
    if ('componentType' in override) {
      if (uniqueComponentTypes.has(override.componentType)) {
        errors.push(`Duplicate componentType '${override.componentType}' in summary overrides`);
      } else {
        uniqueComponentTypes.add(override.componentType);
      }
    }
    if ('componentType' in override && 'componentId' in override) {
      errors.push(`Both componentType and componentId are set in summary overrides`);
    }
  }

  return errors.length > 0 ? [`Summary overrides contain errors: \n- ${errors.join('\n- ')}`] : [];
}

function makeDataModelBindingValidationContext(bootstrap: FormBootstrapContextValue) {
  return {
    lookupBinding: makeLookupBinding(bootstrap.dataModels),
    layoutLookups: bootstrap.layoutLookups,
  };
}

function makeLookupBinding(dataModels: FormStoreState['bootstrap']['dataModels']) {
  if (Object.keys(dataModels).every((dataType) => dataModels[dataType])) {
    return (reference: IDataModelReference) =>
      dataModels[reference.dataType].schemaResult.lookupTool.getSchemaForPath(reference.field);
  }

  return undefined;
}

function addNodeError(errors: LayoutValidationResult, componentId: string, error: string, logPrefix: string) {
  const key = `node/${componentId}`;
  errors[key] ??= [];
  if (!errors[key].includes(error)) {
    errors[key].push(error);
  }
  window.logErrorOnce(`${logPrefix}:\n- ${error}`);
}
