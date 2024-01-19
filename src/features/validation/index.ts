import type Ajv from 'ajv';
import type { JSONSchema7 } from 'json-schema';

import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { IAttachments } from 'src/features/attachments';
import type { Expression, ExprValToActual } from 'src/features/expressions/types';
import type { TextReference, ValidLangParam } from 'src/features/language/useLanguage';
import type { Visibility } from 'src/features/validation/visibility';
import type { ILayoutSets } from 'src/layout/common.generated';
import type { IInstance, IProcess } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export enum FrontendValidationSource {
  EmptyField = '__empty_field__',
  Schema = '__schema__',
  Component = '__component__',
  Expression = '__expression__',
}

export type ValidationSeverity = 'error' | 'warning' | 'info' | 'success';

export enum ValidationIssueSources {
  File = 'File',
  ModelState = 'ModelState',
  Required = 'Required',
  Expression = 'Expression',
  Custom = 'Custom',
}

export enum BackendValidationSeverity {
  Error = 1,
  Warning = 2,
  Informational = 3,
  Success = 5,
}

// prettier-ignore
export enum ValidationMask {
  Schema                = 0b0000000000000001,
  Component             = 0b0000000000000010,
  Expression            = 0b0000000000000100,
  CustomBackend         = 0b0000000000001000,
  Required              = 0b0100000000000000,
  AllExceptRequired     = 0b0011111111111111, // All frontend validations except required
  All                   = 0b0111111111111111, // All frontend validations
  Backend               = 0b1000000000000000, // All backend validations except custom backend validations
  AllIncludingBackend   = 0b1111111111111111, // All validations including backend validations that overlap with frontend validations
}
export type ValidationMaskKeys = keyof typeof ValidationMask;

/* ValidationMaskCollectionKeys are used to group commonly used validation masks together. */
export type ValidationMaskCollectionKeys = Extract<
  ValidationMaskKeys,
  'All' | 'AllExceptRequired' | 'All_Including_Backend'
>;

/* ValidationCategoryKeys are ValidationMasks that represent a single validation category.*/
export type ValidationCategoryKey = Exclude<ValidationMaskKeys, ValidationMaskCollectionKeys>;
/*  A value of 0 represents a validation to be shown immediately */
export type ValidationCategory = (typeof ValidationMask)[ValidationCategoryKey] | 0;

export type ValidationContext = {
  state: ValidationState;
  validating: () => Promise<void>;
  visibility: Visibility;
  setNodeVisibility: (nodes: LayoutNode[], newVisibility: number, rowIndex?: number) => void;
  showAllErrors: boolean;
  setShowAllErrors: (showAllErrors: boolean) => void;
  setAttachmentVisibility: (attachmentId: string, node: LayoutNode, newVisibility: number) => void;
  removeRowVisibilityOnDelete: (node: LayoutNode<'RepeatingGroup'>, rowIndex: number) => void;
};

export type ValidationState = FormValidations & {
  task: BaseValidation[];
};

export type FormValidations = {
  fields: FieldValidations;
  components: ComponentValidations;
};

export type ValidationGroup<T extends GroupedValidation> = {
  [group: string]: T[];
};

export type FieldValidations = {
  [field: string]: ValidationGroup<FieldValidation>;
};

export type ComponentValidations = {
  [componentId: string]: {
    bindingKeys: { [bindingKey: string]: ValidationGroup<ComponentValidation> };
    component: ValidationGroup<ComponentValidation>;
  };
};

export type BaseValidation<Severity extends ValidationSeverity = ValidationSeverity> = {
  message: TextReference;
  severity: Severity;
  category: ValidationCategory;
};

export type GroupedValidation<Severity extends ValidationSeverity = ValidationSeverity> = BaseValidation<Severity> & {
  group: string;
};

export type FieldValidation<Severity extends ValidationSeverity = ValidationSeverity> = GroupedValidation<Severity> & {
  field: string;
};

export type ComponentValidation<Severity extends ValidationSeverity = ValidationSeverity> =
  GroupedValidation<Severity> & {
    componentId: string;
    bindingKey?: string;
    meta?: Record<string, string>;
  };

export type NodeValidation<Severity extends ValidationSeverity = ValidationSeverity> = GroupedValidation<Severity> & {
  componentId: string;
  pageKey: string;
  bindingKey?: string;
  meta?: Record<string, string>;
};

export type AttachmentChange = {
  node: LayoutNode;
  attachmentId: string;
};

/**
 * Contains all of the necessary elements from the redux store to run frontend validations.
 */
export type ValidationDataSources = {
  currentLanguage: string;
  formData: object;
  attachments: IAttachments;
  application: IApplicationMetadata;
  instance: IInstance | null;
  process: IProcess | null;
  layoutSets: ILayoutSets;
  schema: JSONSchema7;
  customValidation: IExpressionValidations | null;
};

export type ValidationContextGenerator = (node: LayoutNode | undefined) => ValidationDataSources;

/**
 * This format is used by the backend to send validation issues to the frontend.
 */
export interface BackendValidationIssue {
  code?: string;
  description?: string;
  field?: string;
  dataElementId?: string;
  severity: BackendValidationSeverity;
  source: ValidationIssueSources;
  customTextKey?: string;
  customTextParams?: ValidLangParam[]; //TODO(Validation): Probably broken for text resources currently
  showImmediately?: boolean; // Not made available
  actLikeRequired?: boolean; // Not made available
}

/**
 * Expression validation object.
 */
export type IExpressionValidation = {
  message: string;
  condition: Expression | ExprValToActual;
  severity: ValidationSeverity;
  showImmediately: boolean;
};

/**
 * Expression validations for all fields.
 */
export type IExpressionValidations = {
  [field: string]: IExpressionValidation[];
};

/**
 * Expression validation or definition with references resolved.
 */
export type IExpressionValidationRefResolved = {
  message: string;
  condition: Expression | ExprValToActual;
  severity?: ValidationSeverity;
  showImmediately?: boolean;
};

/**
 * Unresolved expression validation or definition from the configuration file.
 */
export type IExpressionValidationRefUnresolved =
  | IExpressionValidationRefResolved
  | {
      // If extending using a reference, assume that message and condition are inherited if undefined. This must be verified at runtime.
      message?: string;
      condition?: Expression | ExprValToActual;
      severity?: ValidationSeverity;
      showImmediately?: boolean;
      ref: string;
    };

/**
 * Expression validation configuration file type.
 */
export type IExpressionValidationConfig = {
  validations: { [field: string]: (IExpressionValidationRefUnresolved | string)[] };
  definitions: { [name: string]: IExpressionValidationRefUnresolved };
};

export interface ISchemaValidator {
  rootElementPath: string;
  validator: Ajv;
}

export interface ISchemaValidators {
  [id: string]: ISchemaValidator;
}

/**
 * This format is returned by the json schema validation, and needs to be mapped to components based on the datamodel bindingField.
 */
export type ISchemaValidationError = {
  message: TextReference;
  bindingField: string;
  invalidDataType: boolean;
  keyword: string;
};
